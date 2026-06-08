import {ReceiptBuilder} from 'react-native-receipt-printer';

export function buildTestPrintReceipt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const builder = new ReceiptBuilder({paperWidth: 58});

  builder.header('TEST PRINT');
  builder.divider();
  builder.text('POS Application', {align: 'center', bold: true});
  builder.text('Bluetooth Printer Test', {align: 'center'});
  builder.spacer();
  builder.row('Date', dateStr);
  builder.row('Time', timeStr);
  builder.spacer();
  builder.text('Printer Connected Successfully', {
    align: 'center',
    bold: true,
  });
  builder.spacer();
  builder.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', {align: 'center'});
  builder.text('1234567890', {align: 'center'});
  builder.divider();
  builder.text('TEST SUCCESS', {align: 'center', bold: true, size: 'large'});
  builder.spacer(2);
  builder.cut();

  return builder.build();
}
