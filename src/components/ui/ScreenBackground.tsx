import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors, radii} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const ScreenBackground: React.FC<Props> = ({children, style}) => (
  <View style={[styles.root, style]}>
    <View style={[styles.blob, styles.blobOrange]} />
    <View style={[styles.blob, styles.blobGreen]} />
    <View style={styles.dotGrid} />
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: radii.pill,
    opacity: 0.35,
  },
  blobOrange: {
    width: scale(180),
    height: scale(180),
    backgroundColor: '#FFE4CC',
    top: verticalScale(-40),
    right: scale(-50),
  },
  blobGreen: {
    width: scale(140),
    height: scale(140),
    backgroundColor: '#D1FAE5',
    bottom: verticalScale(120),
    left: scale(-60),
  },
  dotGrid: {
    position: 'absolute',
    top: verticalScale(24),
    right: scale(20),
    width: scale(60),
    height: scale(60),
    opacity: 0.15,
    borderWidth: 1,
    borderColor: colors.muted,
    borderStyle: 'dashed',
    borderRadius: moderateScale(8),
  },
});
