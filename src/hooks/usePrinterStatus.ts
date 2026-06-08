import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  getConnectionStatus,
  subscribePrinterStatus,
} from '../services/bluetoothPrinterService';
import type {PrinterStatusSnapshot} from '../types/printer';

const EMPTY_SNAPSHOT: PrinterStatusSnapshot = {
  connectionStatus: 'disconnected',
  savedPrinter: null,
  connectedName: null,
  connectedAddress: null,
  lastError: null,
};

export function usePrinterStatus(refreshOnFocus = true) {
  const [snapshot, setSnapshot] = useState<PrinterStatusSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const snap = await getConnectionStatus();
    setSnapshot(snap);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = subscribePrinterStatus(setSnapshot);
    void refresh();
    return unsub;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        void refresh();
      }
    }, [refresh, refreshOnFocus]),
  );

  return {snapshot, loading, refresh};
}
