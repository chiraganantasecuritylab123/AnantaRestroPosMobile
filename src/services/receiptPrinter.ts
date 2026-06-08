/**
 * @deprecated Use `bluetoothPrinterService` for all printer operations.
 */
export {
  connectPrinter as connectToPrinter,
  disconnectPrinter,
  disconnectPrinterAndForget,
  getSavedPrinter,
  getSavedPrinter as getSavedPrinterInfo,
  printTestReceipt,
  printOrderReceipt,
  printOrderToken,
  reconnectLastPrinter,
  scanPrinters,
} from './bluetoothPrinterService';
