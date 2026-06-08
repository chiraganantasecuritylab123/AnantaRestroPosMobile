export type PrinterConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed';

export type PrinterType = 'bluetooth_thermal';

export type PrinterDevice = {
  name: string;
  address: string;
  bonded: boolean;
  /** Per-device link status when known */
  linkStatus: PrinterConnectionStatus | 'available';
};

export type SavedPrinter = {
  address: string;
  name: string;
  type: PrinterType;
  lastConnectedAt: string;
};

export type PrinterStatusSnapshot = {
  connectionStatus: PrinterConnectionStatus;
  savedPrinter: SavedPrinter | null;
  connectedName: string | null;
  connectedAddress: string | null;
  lastError: string | null;
};

export type BluetoothReadyResult =
  | {ready: true}
  | {
      ready: false;
      reason:
        | 'permission_denied'
        | 'permission_blocked'
        | 'bluetooth_disabled'
        | 'unsupported';
      message: string;
    };

export type ServiceResult<T = void> =
  | ({ok: true} & (T extends void ? object : {data: T}))
  | {ok: false; error: string};

export type PrintResult = {ok: true} | {ok: false; error: string};
