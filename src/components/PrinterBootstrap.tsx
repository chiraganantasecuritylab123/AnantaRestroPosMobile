import React, {useEffect} from 'react';
import {
  initPrinterServiceListeners,
  reconnectLastPrinter,
} from '../services/bluetoothPrinterService';

/**
 * Initializes Bluetooth printer listeners and reconnects the last saved
 * printer when the main app shell mounts.
 */
export const PrinterBootstrap: React.FC = () => {
  useEffect(() => {
    const unsub = initPrinterServiceListeners();
    void reconnectLastPrinter();
    return unsub;
  }, []);

  return null;
};
