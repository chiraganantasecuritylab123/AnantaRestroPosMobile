import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radii} from '../../theme';

type PaymentKind = 'cash' | 'upi' | 'card' | 'other';

const BADGE_COLORS: Record<PaymentKind, {bg: string; text: string}> = {
  cash: {bg: '#DCFCE7', text: colors.greenDark},
  upi: {bg: '#DBEAFE', text: colors.blue},
  card: {bg: '#EDE9FE', text: colors.purple},
  other: {bg: colors.borderLight, text: colors.muted},
};

function normalizeKind(title?: string): PaymentKind {
  const t = (title ?? '').toLowerCase();
  if (t.includes('cash')) {
    return 'cash';
  }
  if (t.includes('upi') || t.includes('paytm') || t.includes('phonepe')) {
    return 'upi';
  }
  if (t.includes('card') || t.includes('credit') || t.includes('debit')) {
    return 'card';
  }
  return 'other';
}

type Props = {
  title?: string;
};

export const PaymentBadge: React.FC<Props> = ({title}) => {
  const kind = normalizeKind(title);
  const palette = BADGE_COLORS[kind];
  const label = title?.trim() || 'Paid';

  return (
    <View style={[styles.badge, {backgroundColor: palette.bg}]}>
      <Text style={[styles.text, {color: palette.text}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    maxWidth: 80,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
