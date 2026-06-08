import {useEffect, useState} from 'react';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';

function computeOffline(state: NetInfoState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function useNetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const onNetInfoChange = (state: NetInfoState) => {
      if (!mounted || !state) {
        return;
      }
      setOffline(computeOffline(state));
      setIsReady(true);
    };

    const unsubscribe = NetInfo.addEventListener(onNetInfoChange);
    void NetInfo.fetch()
      .then(onNetInfoChange)
      .catch(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {isOffline: offline, isReady};
}
