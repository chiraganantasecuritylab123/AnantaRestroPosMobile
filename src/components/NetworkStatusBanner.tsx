import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {colors} from '../theme';

export const NetworkStatusBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {isOffline, isReady} = useNetworkStatus();

  if (!isReady || !isOffline) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.container, {paddingBottom: Math.max(insets.bottom, 8)}]}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: colors.error,
    paddingTop: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
