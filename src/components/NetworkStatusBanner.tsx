import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {colors} from '../theme';
import {moderateScale, scale, verticalScale} from '../utils/responsive';

export const NetworkStatusBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {isOffline, isReady} = useNetworkStatus();

  if (!isReady || !isOffline) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {paddingBottom: Math.max(insets.bottom, verticalScale(8))},
      ]}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: verticalScale(10),
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: colors.error,
    paddingTop: verticalScale(10),
    paddingHorizontal: scale(16),
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
});
