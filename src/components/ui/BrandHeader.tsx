import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography } from '../../theme';

type Props = {
  compact?: boolean;
  style?: ViewStyle;
};

export const BrandHeader: React.FC<Props> = ({ compact, style }) => (
  <View style={[styles.row, style]}>
    <Image source={require('../../assets/logo-dark.png')} style={{ width: 150, height: 50 }} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    width: 28,
    height: 14,
    borderRadius: 6,
  },
  ribbonTop: {
    top: 10,
    left: 8,
    transform: [{ rotate: '-25deg' }],
  },
  ribbonBottom: {
    bottom: 10,
    right: 8,
    transform: [{ rotate: '25deg' }],
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  nameCompact: {
    fontSize: 18,
  },
  nameAccent: {
    color: colors.orange,
  },
  tagline: {
    ...typography.caption,
    marginTop: 2,
    maxWidth: 220,
  },
});
