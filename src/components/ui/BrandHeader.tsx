import React from 'react';
import {Image, StyleSheet, View, ViewStyle} from 'react-native';
import {scale} from '../../utils/responsive';

type Props = {
  compact?: boolean;
  style?: ViewStyle;
};

export const BrandHeader: React.FC<Props> = ({style}) => (
  <View style={[styles.row, style]}>
    <Image
      source={require('../../assets/logo-dark.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  logo: {
    width: scale(150),
    aspectRatio: 3,
    height: undefined,
  },
});
