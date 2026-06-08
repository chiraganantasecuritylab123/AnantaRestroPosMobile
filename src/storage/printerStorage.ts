import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SavedPrinter} from '../types/printer';

const SAVED_PRINTER_KEY = '@pos/saved_bluetooth_printer';
const AUTO_PRINT_ON_ORDER_KEY = '@pos/auto_print_on_order';

/** Default true — print after order when a printer is paired on this device. */
export async function loadAutoPrintOnOrder(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_PRINT_ON_ORDER_KEY);
    if (raw === null) {
      return true;
    }
    return raw === 'true';
  } catch {
    return true;
  }
}

export async function saveAutoPrintOnOrder(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_PRINT_ON_ORDER_KEY, enabled ? 'true' : 'false');
}

export async function loadSavedPrinter(): Promise<SavedPrinter | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PRINTER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SavedPrinter;
  } catch {
    return null;
  }
}

export async function saveSavedPrinter(printer: SavedPrinter): Promise<void> {
  await AsyncStorage.setItem(SAVED_PRINTER_KEY, JSON.stringify(printer));
}

export async function clearSavedPrinter(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_PRINTER_KEY);
}

/** @deprecated use loadSavedPrinter */
export async function getSavedPrinterAddress(): Promise<string | null> {
  const p = await loadSavedPrinter();
  return p?.address ?? null;
}
