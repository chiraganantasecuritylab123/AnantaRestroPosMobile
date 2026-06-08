import {ReceiptBuilder} from 'react-native-receipt-printer';

export type OrderTokenPrintInput = {
  tokenLabel: string;
  orderId: string | number;
  deliveryType: string;
  tableTitle?: string | null;
  customerName?: string;
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

export function buildOrderTokenReceipt(data: OrderTokenPrintInput) {
  const builder = new ReceiptBuilder({paperWidth: 58});

  builder.header('ORDER TOKEN');
  builder.divider();
  builder.text(data.tokenLabel, {align: 'center', bold: true, size: 'large'});
  builder.row('Order', String(data.orderId));
  builder.row('Service', formatDelivery(data.deliveryType));
  if (data.tableTitle?.trim()) {
    builder.row('Table', data.tableTitle.trim());
  }
  if (data.customerName?.trim()) {
    builder.row('Customer', data.customerName.trim().slice(0, 22));
  }
  builder.text(new Date().toLocaleString(), {align: 'center'});
  builder.spacer(2);
  builder.cut();

  return builder.build();
}
