import {
  connect,
  disconnect,
  ensureReady,
  getBondedDevices,
  getConnectedDevice,
  isConnected,
  onConnectionChange,
  print,
  requestBluetoothEnabled,
  requestBluetoothPermissions,
  startScan,
  stopScan,
} from 'react-native-receipt-printer';
import {
  clearSavedPrinter,
  loadSavedPrinter,
  saveSavedPrinter,
} from '../storage/printerStorage';
import {buildPosReceipt, type PosReceiptInput} from '../utils/posReceipt';
import {buildTestPrintReceipt} from '../utils/testPrintReceipt';
import {buildOrderTokenReceipt, type OrderTokenPrintInput} from '../utils/orderTokenReceipt';
import type {
  BluetoothReadyResult,
  PrintResult,
  PrinterConnectionStatus,
  PrinterDevice,
  PrinterStatusSnapshot,
  SavedPrinter,
  ServiceResult,
} from '../types/printer';

export type {PrinterDevice, SavedPrinter, PrinterStatusSnapshot, PrintResult};

const PRINTER_TYPE = 'bluetooth_thermal' as const;

let connectionStatus: PrinterConnectionStatus = 'disconnected';
let lastError: string | null = null;
const statusListeners = new Set<(snap: PrinterStatusSnapshot) => void>();

function permissionMessage(
  reason: NonNullable<BluetoothReadyResult & {ready: false}>['reason'],
): string {
  switch (reason) {
    case 'permission_blocked':
      return 'Bluetooth permission is blocked. Open app Settings and allow Nearby devices / Bluetooth.';
    case 'permission_denied':
      return 'Bluetooth permission is required to find and connect your thermal printer.';
    case 'bluetooth_disabled':
      return 'Turn on Bluetooth to use the receipt printer.';
    case 'unsupported':
      return 'Bluetooth is not supported on this device.';
    default:
      return 'Bluetooth is not available.';
  }
}

async function notifyStatus() {
  const snap = await getConnectionStatus();
  statusListeners.forEach(fn => fn(snap));
}

function setConnectionStatus(status: PrinterConnectionStatus, error?: string | null) {
  connectionStatus = status;
  if (error !== undefined) {
    lastError = error;
  }
  void notifyStatus();
}

export function subscribePrinterStatus(
  listener: (snap: PrinterStatusSnapshot) => void,
): () => void {
  statusListeners.add(listener);
  void getConnectionStatus().then(listener);
  return () => statusListeners.delete(listener);
}

let unsubscribeNativeEvents: (() => void) | null = null;

export function initPrinterServiceListeners(): () => void {
  if (unsubscribeNativeEvents) {
    return unsubscribeNativeEvents;
  }
  const unsub = onConnectionChange(event => {
    if (event.type === 'connected') {
      setConnectionStatus('connected', null);
    } else {
      setConnectionStatus('disconnected', null);
    }
  });
  unsubscribeNativeEvents = unsub;
  return unsub;
}

export async function ensureBluetoothReady(): Promise<BluetoothReadyResult> {
  const perm = await requestBluetoothPermissions();
  if (!perm.granted) {
    const reason = perm.blocked ? 'permission_blocked' : 'permission_denied';
    return {ready: false, reason, message: permissionMessage(reason)};
  }

  const ready = await ensureReady();
  if (!ready.ready) {
    const reason = ready.reason ?? 'unsupported';
    return {ready: false, reason, message: permissionMessage(reason)};
  }

  return {ready: true};
}

export async function requestEnableBluetooth(): Promise<boolean> {
  try {
    return await requestBluetoothEnabled();
  } catch {
    return false;
  }
}

function mapDevice(
  d: {name?: string; address: string},
  bonded: boolean,
): PrinterDevice {
  const connected = getConnectedDevice();
  const isThisConnected =
    isConnected() && connected?.address === d.address;
  return {
    name: d.name?.trim() || 'Unknown printer',
    address: d.address,
    bonded,
    linkStatus: isThisConnected ? 'connected' : bonded ? 'available' : 'available',
  };
}

export async function scanPrinters(options?: {
  scanMs?: number;
  includeDiscovery?: boolean;
}): Promise<ServiceResult<PrinterDevice[]>> {
  const scanMs = options?.scanMs ?? 10_000;
  const includeDiscovery = options?.includeDiscovery ?? true;

  const ready = await ensureBluetoothReady();
  if (!ready.ready) {
    setConnectionStatus('failed', ready.message);
    return {ok: false, error: ready.message};
  }

  const byAddress = new Map<string, PrinterDevice>();

  try {
    const bonded = await getBondedDevices();
    for (const d of bonded) {
      byAddress.set(d.address, mapDevice(d, true));
    }

    if (includeDiscovery && scanMs > 0) {
      await new Promise<void>(resolve => {
        let finished = false;
        const done = () => {
          if (finished) {
            return;
          }
          finished = true;
          void stopScan().finally(resolve);
        };

        void startScan(device => {
          if (!byAddress.has(device.address)) {
            byAddress.set(device.address, mapDevice(device, false));
            void notifyStatus();
          }
        }, {timeoutMs: scanMs});

        setTimeout(done, scanMs + 200);
      });
    }

    const devices = [...byAddress.values()].sort((a, b) => {
      if (a.linkStatus === 'connected') {
        return -1;
      }
      if (b.linkStatus === 'connected') {
        return 1;
      }
      if (a.bonded !== b.bonded) {
        return a.bonded ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {ok: true, data: devices};
  } catch (e) {
    const msg = (e as Error).message ?? 'Could not scan for printers';
    return {ok: false, error: msg};
  }
}

export async function connectPrinter(
  address: string,
  name?: string,
): Promise<PrintResult> {
  const ready = await ensureBluetoothReady();
  if (!ready.ready) {
    setConnectionStatus('failed', ready.message);
    return {ok: false, error: ready.message};
  }

  setConnectionStatus('connecting', null);

  try {
    await connect(address);
    const connected = getConnectedDevice();
    const printerName =
      name?.trim() ||
      connected?.name?.trim() ||
      'Bluetooth Thermal Printer';

    await saveSavedPrinter({
      address,
      name: printerName,
      type: PRINTER_TYPE,
      lastConnectedAt: new Date().toISOString(),
    });

    setConnectionStatus('connected', null);
    return {ok: true};
  } catch (e) {
    const msg = (e as Error).message ?? 'Connection failed';
    setConnectionStatus('failed', msg);
    return {ok: false, error: msg};
  }
}

export async function disconnectPrinter(): Promise<void> {
  try {
    await disconnect();
  } catch {
    // ignore
  }
  setConnectionStatus('disconnected', null);
  await notifyStatus();
}

export async function disconnectPrinterAndForget(): Promise<void> {
  await disconnectPrinter();
  await clearSavedPrinter();
  await notifyStatus();
}

export async function reconnectLastPrinter(): Promise<PrintResult> {
  const saved = await loadSavedPrinter();
  if (!saved?.address) {
    setConnectionStatus('disconnected', null);
    return {ok: false, error: 'No saved printer. Connect one in Printer Settings.'};
  }

  if (isConnected()) {
    const current = getConnectedDevice();
    if (current?.address === saved.address) {
      setConnectionStatus('connected', null);
      return {ok: true};
    }
  }

  return connectPrinter(saved.address, saved.name);
}

export async function getConnectionStatus(): Promise<PrinterStatusSnapshot> {
  const savedPrinter = await loadSavedPrinter();
  const connected = getConnectedDevice();
  const linked = isConnected() && connected;

  if (linked) {
    connectionStatus = 'connected';
  } else if (connectionStatus === 'connecting') {
    // keep connecting
  } else if (connectionStatus === 'failed') {
    // keep failed until next action
  } else {
    connectionStatus = 'disconnected';
  }

  return {
    connectionStatus,
    savedPrinter,
    connectedName: linked ? connected?.name ?? savedPrinter?.name ?? null : null,
    connectedAddress: linked ? connected?.address ?? null : null,
    lastError,
  };
}

export async function getSavedPrinter(): Promise<SavedPrinter | null> {
  return loadSavedPrinter();
}

async function ensureConnectedForPrint(): Promise<PrintResult> {
  if (isConnected()) {
    return {ok: true};
  }
  return reconnectLastPrinter();
}

export async function printTestReceipt(): Promise<PrintResult> {
  const conn = await ensureConnectedForPrint();
  if (!conn.ok) {
    return conn;
  }

  try {
    const receipt = buildTestPrintReceipt();
    await print(receipt);
    return {ok: true};
  } catch (e) {
    const msg = (e as Error).message ?? 'Test print failed';
    setConnectionStatus('failed', msg);
    return {ok: false, error: msg};
  }
}

export async function printOrderReceipt(
  input: PosReceiptInput,
): Promise<PrintResult> {
  const conn = await ensureConnectedForPrint();
  if (!conn.ok) {
    return conn;
  }

  try {
    const receipt = buildPosReceipt(input);
    await print(receipt);
    return {ok: true};
  } catch (e) {
    const msg = (e as Error).message ?? 'Receipt print failed';
    setConnectionStatus('failed', msg);
    return {ok: false, error: msg};
  }
}

export async function printOrderToken(
  input: OrderTokenPrintInput,
): Promise<PrintResult> {
  const conn = await ensureConnectedForPrint();
  if (!conn.ok) {
    return conn;
  }

  try {
    const receipt = buildOrderTokenReceipt(input);
    await print(receipt);
    return {ok: true};
  } catch (e) {
    const msg = (e as Error).message ?? 'Token print failed';
    setConnectionStatus('failed', msg);
    return {ok: false, error: msg};
  }
}
