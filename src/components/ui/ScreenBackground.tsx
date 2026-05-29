import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../../theme';

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
    borderRadius: 999,
    opacity: 0.35,
  },
  blobOrange: {
    width: 180,
    height: 180,
    backgroundColor: '#FFE4CC',
    top: -40,
    right: -50,
  },
  blobGreen: {
    width: 140,
    height: 140,
    backgroundColor: '#D1FAE5',
    bottom: 120,
    left: -60,
  },
  dotGrid: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 60,
    height: 60,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: colors.muted,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
});
