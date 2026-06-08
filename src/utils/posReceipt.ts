import {ReceiptBuilder} from 'react-native-receipt-printer';
import type {CartItem} from '../features/cartSlice';
import type {DeliveryType} from '../features/cartSlice';
import {resolveCurrencySymbol} from './currency';

export type PosReceiptInput = {
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  currency: string;
  tokenLabel: string;
  orderId: string | number;
  invoiceId?: string | number;
  deliveryType: DeliveryType | string;
  tableTitle?: string | null;
  customerName?: string;
  paymentMethod?: string;
  items: CartItem[];
  netTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  total: number;
  printedAt?: Date;
};

function formatDelivery(type: string) {
  const t = type.toLowerCase();
  if (t === 'takeaway') {
    return 'Takeaway';
  }
  if (t === 'dinein') {
    return 'Dine in';
  }
  if (t === 'delivery') {
    return 'Delivery';
  }
  return type;
}

export function buildPosReceipt(data: PosReceiptInput) {
  const currency = resolveCurrencySymbol(data.currency);
  const builder = new ReceiptBuilder({paperWidth: 58});

  builder.header(data.storeName || 'Ananta POS');

  if (data.storeAddress?.trim()) {
    builder.text(data.storeAddress.trim(), {align: 'center'});
  }
  if (data.storePhone?.trim()) {
    builder.text(`Tel: ${data.storePhone.trim()}`, {align: 'center'});
  }

  builder.divider();
  builder.row('Token', data.tokenLabel);
  builder.row('Order', String(data.orderId));
  if (data.invoiceId != null) {
    builder.row('Invoice', String(data.invoiceId));
  }

  const dateStr = (data.printedAt ?? new Date()).toLocaleString();
  builder.row('Date', dateStr);
  builder.row('Service', formatDelivery(data.deliveryType));

  if (data.tableTitle?.trim()) {
    builder.row('Table', data.tableTitle.trim());
  }
  if (data.customerName?.trim()) {
    builder.row('Customer', data.customerName.trim().slice(0, 22));
  }

  builder.divider();
  builder.text('ITEMS', {bold: true, align: 'center'});
  builder.divider();

  for (const item of data.items) {
    const title = (item.title ?? 'Item').slice(0, 18);
    const qty = Number(item.quantity ?? 1);
    const unit = Number(item.net_price ?? item.price ?? 0);
    const lineTotal = (unit * qty).toFixed(2);
    builder.row(`${title} x${qty}`, `${currency}${lineTotal}`);
    if (item.notes?.trim()) {
      builder.text(`  ${item.notes.trim().slice(0, 30)}`);
    }
  }

  builder.divider();
  builder.row('Subtotal', `${currency}${data.netTotal.toFixed(2)}`);
  if (data.taxTotal > 0) {
    builder.row('Tax', `${currency}${data.taxTotal.toFixed(2)}`);
  }
  if (data.serviceChargeTotal > 0) {
    builder.row('Service chg', `${currency}${data.serviceChargeTotal.toFixed(2)}`);
  }

  builder.text('TOTAL', {bold: true, align: 'center'});
  builder.text(`${currency}${data.total.toFixed(2)}`, {
    bold: true,
    align: 'center',
    size: 'large',
  });

  if (data.paymentMethod?.trim()) {
    builder.row('Payment', data.paymentMethod.trim());
  }

  builder.spacer();
  builder.text('Thank you!', {align: 'center'});
  builder.text('Visit again', {align: 'center'});
  builder.spacer(2);
  builder.cut();

  return builder.build();
}
