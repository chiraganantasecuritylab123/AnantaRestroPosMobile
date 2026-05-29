import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../useAppHooks';
import {Card, PaymentBadge, ScreenBackground} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const OrdersScreen: React.FC = () => {
  const orders = useAppSelector(state => state.orderHistory.items);

  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (o?.total ?? 0), 0),
    [orders],
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Activity</Text>
            <Text style={styles.title}>Orders</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{orders.length}</Text>
          </View>
        </View>

        {orders.length > 0 && (
          <Card style={styles.summaryStrip}>
            <View>
              <Text style={styles.summaryLabel}>Session total</Text>
              <Text style={styles.summaryValue}>
                ₹ {totalRevenue.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.summaryHint}>This device · recent</Text>
          </Card>
        )}

        <FlatList
          data={orders}
          keyExtractor={item => item?.id ?? String(item?.orderId)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                Completed orders from checkout will appear here with token
                number and total.
              </Text>
            </Card>
          }
          renderItem={({item}) => (
            <Card style={styles.orderCard}>
              <View style={[styles.orderIcon, {backgroundColor: '#DCFCE7'}]}>
                <Text>🛒</Text>
              </View>
              <View style={styles.orderBody}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderTitle}>
                    Token #{item?.tokenNo ?? '—'}
                  </Text>
                  <PaymentBadge title={item?.paymentMethod} />
                </View>
                <Text style={styles.customerName} numberOfLines={2}>
                  {item?.customerName ?? 'Walk-in'}
                </Text>
                <Text style={styles.metaText}>
                  Order #{item?.orderId ?? '—'} · {formatTime(item?.createdAt ?? '')}
                </Text>
                <Text style={styles.amountValue}>
                  ₹ {(item?.total ?? 0).toFixed(2)}
                </Text>
              </View>
            </Card>
          )}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  countBadgeText: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryStrip: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {fontSize: 12, fontWeight: '700', color: colors.muted},
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  summaryHint: {fontSize: 12, color: colors.muted, maxWidth: '42%'},
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emptyCard: {
    marginTop: spacing.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyEmoji: {fontSize: 44, marginBottom: spacing.md},
  emptyTitle: {fontSize: 20, fontWeight: '800', color: colors.navy},
  emptyText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    ...typography.body,
    fontSize: 15,
  },
  orderCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orderBody: {flex: 1},
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  customerName: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  amountValue: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
});
