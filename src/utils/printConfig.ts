import {loadAutoPrintOnOrder, loadSavedPrinter} from '../storage/printerStorage';

/** POS init `printSettings` from GET /pos/init (flexible backend shapes). */
export interface PrintSettingsConfig {
  /** Backend: print_settings.is_enable_print from GET /pos/init */
  is_enable_print?: boolean;
  is_enabled?: boolean;
  enabled?: boolean;
  is_print_enabled?: boolean;
  isEnablePrint?: boolean;
  enable_print?: boolean;
  print_receipt?: boolean;
  printReceipt?: boolean;
  auto_print?: boolean;
  auto_print_receipt?: boolean;
  autoPrintReceipt?: boolean;
  print_order_receipt?: boolean;
  printOrderReceipt?: boolean;
  print_bill?: boolean;
  printBill?: boolean;
  print_token?: boolean;
  printToken?: boolean;
  printer_enabled?: boolean;
  receipt_print_enabled?: boolean;
  receipt?: PrintSettingsConfig | boolean;
  receipt_print?: PrintSettingsConfig | boolean;
  order_receipt?: PrintSettingsConfig | boolean;
  settings?: PrintSettingsConfig;
  [key: string]: unknown;
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'enabled' || v === 'on';
  }
  return false;
}

function isFalsyFlag(value: unknown): boolean {
  if (value === false || value === 0) {
    return true;
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'false' || v === '0' || v === 'no' || v === 'disabled' || v === 'off';
  }
  return false;
}

/** Normalize API field names / JSON strings into an object. */
export function normalizePrintSettings(raw: unknown): PrintSettingsConfig | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'boolean') {
    return {is_enabled: raw};
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return normalizePrintSettings(JSON.parse(trimmed));
    } catch {
      return {is_enabled: isTruthyFlag(trimmed)};
    }
  }
  if (typeof raw !== 'object') {
    return null;
  }
  const obj = raw as PrintSettingsConfig;
  if (obj.settings && typeof obj.settings === 'object') {
    return {...obj.settings, ...obj};
  }
  return obj;
}

function keySuggestsReceiptPrint(key: string): boolean {
  const k = key.toLowerCase();
  if (k.includes('disable') || k.includes('token') || k.includes('kot')) {
    return false;
  }
  if (k === 'is_enable_print' || k === 'isenableprint') {
    return true;
  }
  if (k.includes('print') && (k.includes('receipt') || k.includes('bill') || k.includes('order'))) {
    return true;
  }
  return (
    k === 'is_enabled' ||
    k === 'enabled' ||
    k === 'is_print_enabled' ||
    k === 'enable_print' ||
    k === 'auto_print' ||
    k === 'printer_enabled' ||
    k === 'receipt_print_enabled'
  );
}

function deepScanPrintEnabled(value: unknown, depth = 0): boolean {
  if (depth > 6 || value == null) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return isTruthyFlag(value);
  }
  if (typeof value !== 'object') {
    return false;
  }

  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (keySuggestsReceiptPrint(key) && isTruthyFlag(val)) {
      return true;
    }
    if (typeof val === 'object' && deepScanPrintEnabled(val, depth + 1)) {
      return true;
    }
  }
  return false;
}

function deepScanExplicitlyDisabled(value: unknown, depth = 0): boolean {
  if (depth > 6 || value == null || typeof value !== 'object') {
    return false;
  }
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (keySuggestsReceiptPrint(key) && isFalsyFlag(val)) {
      return true;
    }
    if (typeof val === 'object' && deepScanExplicitlyDisabled(val, depth + 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Outlet receipt flag — matches web POS: `printSettings?.is_enable_print || 0`.
 */
export function isOutletReceiptPrintEnabled(
  printSettings: unknown | null | undefined,
): boolean {
  const normalized = normalizePrintSettings(printSettings);
  if (normalized == null) {
    return false;
  }
  const row = normalized as Record<string, unknown>;
  if (row.is_enable_print !== undefined && row.is_enable_print !== null) {
    return isTruthyFlag(row.is_enable_print);
  }
  if (row.isEnablePrint !== undefined && row.isEnablePrint !== null) {
    return isTruthyFlag(row.isEnablePrint);
  }
  if (deepScanExplicitlyDisabled(normalized)) {
    return false;
  }
  return deepScanPrintEnabled(normalized);
}

/** True when outlet `printSettings` from POS init enables receipt printing. */
export function isReceiptPrintEnabled(printSettings: unknown | null | undefined): boolean {
  return isOutletReceiptPrintEnabled(printSettings);
}

export function isExplicitlyPrintDisabled(
  printSettings: unknown | null | undefined,
): boolean {
  const normalized = normalizePrintSettings(printSettings);
  if (!normalized) {
    return false;
  }
  return deepScanExplicitlyDisabled(normalized);
}

export function isTokenPrintEnabled(printSettings: unknown | null | undefined): boolean {
  const normalized = normalizePrintSettings(printSettings);
  if (!normalized) {
    return false;
  }
  const s = normalized as Record<string, unknown>;
  return (
    isTruthyFlag(s.print_token) ||
    isTruthyFlag(s.printToken) ||
    isTruthyFlag(s.print_kot) ||
    isTruthyFlag(s.auto_print_token)
  );
}

/**
 * Whether to print a receipt after placing an order.
 * Device auto-print ON always attempts print (Bluetooth reconnect in print service).
 * When OFF, follows outlet `is_enable_print` like the web POS.
 */
export async function shouldPrintOrderReceipt(
  printSettings: unknown | null | undefined,
): Promise<boolean> {
  const autoLocal = await loadAutoPrintOnOrder();
  if (autoLocal) {
    return true;
  }
  return isOutletReceiptPrintEnabled(printSettings);
}

export async function getReceiptPrintSkipReason(
  printSettings: unknown | null | undefined,
): Promise<string> {
  const autoLocal = await loadAutoPrintOnOrder();
  if (!autoLocal && !isOutletReceiptPrintEnabled(printSettings)) {
    return 'Auto-print is off on this device and outlet receipt printing is disabled. Turn on auto-print in Printer menu or enable print in outlet settings.';
  }
  if (!autoLocal) {
    return 'Auto-print on new order is off. Enable it in Printer menu.';
  }
  const saved = await loadSavedPrinter();
  if (!saved) {
    return 'No printer saved. Connect a printer under Profile → Printer settings.';
  }
  if (!isOutletReceiptPrintEnabled(printSettings)) {
    return 'Outlet receipt printing is off; printing from device auto-print. Connect your Bluetooth printer.';
  }
  return 'Could not print. Check Bluetooth printer connection in Printer settings.';
}
