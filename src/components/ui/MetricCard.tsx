import React from 'react';
import {StyleSheet, Text, ViewStyle} from 'react-native';
import {Card} from './Card';
import {colors, spacing, typography} from '../../theme';
import {moderateScale, verticalScale} from '../../utils/responsive';

type Props = {
  value: string;
  label: string;
  accent?: string;
  style?: ViewStyle;
};

export const MetricCard: React.FC<Props> = ({
  value,
  label,
  accent,
  style,
}) => (
  <Card style={StyleSheet.flatten([styles.card, style])}>
    <Text style={[styles.value, accent ? {color: accent} : null]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: verticalScale(18),
    paddingHorizontal: spacing.lg,
  },
  value: {
    fontSize: moderateScale(26),
    fontWeight: '800',
    color: colors.navy,
  },
  label: {
    marginTop: verticalScale(6),
    ...typography.caption,
    fontWeight: '600',
  },
});
