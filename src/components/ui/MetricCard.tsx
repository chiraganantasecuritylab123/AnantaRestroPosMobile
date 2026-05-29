import React from 'react';
import {StyleSheet, Text, ViewStyle} from 'react-native';
import {Card} from './Card';
import {colors} from '../../theme';

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
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
});
