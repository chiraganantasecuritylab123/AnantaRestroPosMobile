import type {CartItem, DeliveryType} from '../features/cartSlice';
import type {
  CreateOrderAndInvoiceResponse,
  CreateOrderResponse,
} from './orderApi';
import type {PosInitResponse} from './posApi';
import {printOrderReceipt, printOrderToken} from './bluetoothPrinterService';
import {
  isTokenPrintEnabled,
  shouldPrintOrderReceipt,
} from '../utils/printConfig';
import {formatTokenLabel} from '../utils/posOrder';
import type {PosReceiptInput} from '../utils/posReceipt';
import type {PrintResult} from '../types/printer';

export type OrderPlacementPrintInput = {
  printSettings: unknown | null | undefined;
  storeSettings: PosInitResponse['storeSettings'];
  currency: string;
  items: CartItem[];
  netTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  total: number;
  deliveryType: DeliveryType | string;
  tableTitle?: string | null;
  customerName: string;
  paymentMethod?: string;
  orderResponse: CreateOrderResponse | CreateOrderAndInvoiceResponse;
  invoiceId?: string | number | undefined;
};

export type OrderPlacementPrintOutcome = {
  receipt: {attempted: boolean; ok: boolean; error?: string};
  token: {attempted: boolean; ok: boolean; error?: string};
};

function buildReceiptInput(input: OrderPlacementPrintInput): PosReceiptInput {
  return {
    storeName: input.storeSettings?.store_name?.trim() ?? 'Restaurant',
    storeAddress: input.storeSettings?.address ?? null,
    storePhone: input.storeSettings?.phone ?? null,
    currency: input.currency,
    tokenLabel: formatTokenLabel(input.orderResponse),
    orderId: input.orderResponse.orderId,
    invoiceId: input.invoiceId,
    deliveryType: input.deliveryType,
    tableTitle: input.tableTitle ?? null,
    customerName: input.customerName,
    paymentMethod: input.paymentMethod,
    items: input.items,
    netTotal: input.netTotal,
    taxTotal: input.taxTotal,
    serviceChargeTotal: input.serviceChargeTotal,
    total: input.total,
  };
}

function toOutcome(
  attempted: boolean,
  result?: PrintResult,
): {attempted: boolean; ok: boolean; error?: string} {
  if (!attempted) {
    return {attempted: false, ok: false};
  }
  return {
    attempted: true,
    ok: result?.ok === true,
    error: result?.ok === false ? result.error : undefined,
  };
}

/**
 * Prints receipt (and optional token) when enabled in `printSettings` from POS init.
 * Order is already saved — print failures are returned but do not throw.
 */
export async function printOnOrderPlaced(
  input: OrderPlacementPrintInput,
): Promise<OrderPlacementPrintOutcome> {
  const receiptEnabled = await shouldPrintOrderReceipt(input.printSettings);
  const tokenEnabled = isTokenPrintEnabled(input.printSettings);

  let receiptResult: PrintResult | undefined;
  if (receiptEnabled) {
    receiptResult = await printOrderReceipt(buildReceiptInput(input));
  }

  let tokenResult: PrintResult | undefined;
  if (tokenEnabled) {
    tokenResult = await printOrderToken({
      tokenLabel: formatTokenLabel(input.orderResponse),
      orderId: input.orderResponse.orderId,
      deliveryType: input.deliveryType,
      tableTitle: input.tableTitle,
      customerName: input.customerName,
    });
  }

  return {
    receipt: toOutcome(receiptEnabled, receiptResult),
    token: toOutcome(tokenEnabled, tokenResult),
  };
}

export function wasReceiptPrinted(outcome: OrderPlacementPrintOutcome): boolean {
  return outcome.receipt.attempted && outcome.receipt.ok;
}

export function formatPrintFailureMessage(
  outcome: OrderPlacementPrintOutcome,
): string | null {
  const parts: string[] = [];
  if (outcome.receipt.attempted && !outcome.receipt.ok) {
    parts.push(outcome.receipt.error ?? 'Receipt did not print.');
  }
  if (outcome.token.attempted && !outcome.token.ok) {
    parts.push(outcome.token.error ?? 'Token did not print.');
  }
  return parts.length ? parts.join('\n') : null;
}

export function formatPrintSkippedMessage(
  outcome: OrderPlacementPrintOutcome,
  skipReason: string,
): string | null {
  if (outcome.receipt.attempted) {
    return formatPrintFailureMessage(outcome);
  }
  return skipReason;
}
