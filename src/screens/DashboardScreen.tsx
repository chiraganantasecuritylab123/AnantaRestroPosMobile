import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import {useAppSelector} from '../useAppHooks';
import type {MainTabParamList} from '../navigation/types';
import {useGetPosInitQuery} from '../services/posApi';
import {
  Card,
  MetricCard,
  PaymentBadge,
  ScreenBackground,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';

type DashboardNav = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      return 'Just now';
    }
    if (mins < 60) {
      return `${mins} min${mins === 1 ? '' : 's'} ago`;
    }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    }
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

const QUICK_ACTIONS = [
  {key: 'sale', label: 'New Sale', icon: '🛒', tint: '#DCFCE7', nav: 'POS' as const},
  {key: 'tables', label: 'Tables', icon: '🪑', tint: '#FFEDD5', nav: 'POS' as const},
  {key: 'orders', label: 'Orders', icon: '📋', tint: '#EDE9FE', nav: 'Orders' as const},
  {key: 'profile', label: 'Profile', icon: '👤', tint: '#DBEAFE', nav: 'Profile' as const},
];

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNav>();
  const user = useAppSelector(state => state.authToken.user);
  const orders = useAppSelector(state => state.orderHistory.items);
  const cartItems = useAppSelector(state => state.cart.items);
  const {data: posInit, isFetching, refetch} = useGetPosInitQuery();

  const storeName =
    posInit?.storeSettings?.store_name?.trim() || 'Your restaurant';
  const currency = posInit?.storeSettings?.currency ?? '₹';
  const tablesCount = posInit?.storeTables?.length ?? 0;
  const menuCount =
    posInit?.menuItems?.filter(m => m?.is_enabled).length ?? 0;

  const revenueToday = useMemo(
    () => orders.reduce((sum, o) => sum + (o?.total ?? 0), 0),
    [orders],
  );

  const cartQty = useMemo(
    () => cartItems.reduce((n, i) => n + Number(i?.quantity ?? 0), 0),
    [cartItems],
  );

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) {
      return 'Good Morning';
    }
    if (h < 17) {
      return 'Good Afternoon';
    }
    return 'Good Evening';
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const initials = (user?.name ?? 'W')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showLowStockAlert = menuCount > 0 && menuCount < 5;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={[colors.green]}
              tintColor={colors.green}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {greeting}, {user?.name?.split(' ')?.[0] ?? 'Waiter'}
              </Text>
              <Text style={styles.storeName}>{storeName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.dateChip}>
                <Text style={styles.dateChipText}>Today, {dateLabel}</Text>
              </TouchableOpacity>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>

          <LinearGradient
            colors={[...colors.gradientHero]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Today&apos;s Sales</Text>
              <Text style={styles.heroInfo}>ⓘ</Text>
            </View>
            <Text style={styles.heroAmount}>
              {currency} {revenueToday.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {orders.length} order{orders.length === 1 ? '' : 's'} this shift
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroCta}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('POS', {screen: 'PosHome'})
              }>
              <Text style={styles.heroCtaText}>Start new sale →</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity
                key={a.key}
                activeOpacity={0.85}
                onPress={() => {
                  if (a.nav === 'POS') {
                    navigation.navigate('POS', {screen: 'PosHome'});
                  } else {
                    navigation.navigate(a.nav);
                  }
                }}>
                <Card style={styles.quickCard}>
                  <View style={[styles.quickIcon, {backgroundColor: a.tint}]}>
                    <Text style={styles.quickEmoji}>{a.icon}</Text>
                  </View>
                  <Text style={styles.quickLabel}>{a.label}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          {(showLowStockAlert || cartQty > 0) && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('POS', {screen: 'PosHome'})
              }>
              <View style={styles.alertStrip}>
                <View style={styles.alertIcon}>
                  <Text style={styles.alertIconText}>🔔</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>
                    {cartQty > 0
                      ? `${cartQty} items in open cart`
                      : `${menuCount} menu items synced`}
                  </Text>
                  <Text style={styles.alertSub}>
                    Tap to open POS and continue
                  </Text>
                </View>
                <Text style={styles.alertChevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.metricsRow}>
            <MetricCard value={String(orders.length)} label="Orders" />
            <MetricCard
              value={String(cartQty)}
              label="Cart qty"
              accent={cartQty > 0 ? colors.orange : undefined}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard value={String(tablesCount)} label="Tables" />
            <MetricCard value={String(menuCount)} label="Menu items" />
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Sales</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.viewAll}>View All ›</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                Completed orders from checkout will appear here.
              </Text>
            </Card>
          ) : (
            recentOrders.map(o => (
              <Card key={o?.id} style={styles.orderRow}>
                <View style={[styles.orderIcon, {backgroundColor: '#DCFCE7'}]}>
                  <Text>🛒</Text>
                </View>
                <View style={styles.orderBody}>
                  <Text style={styles.orderTitle}>
                    Token #{o?.tokenNo ?? '—'}
                  </Text>
                  <Text style={styles.orderMeta} numberOfLines={1}>
                    {o?.customerName ?? 'Walk-in'}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>
                    {currency} {(o?.total ?? 0).toFixed(0)}
                  </Text>
                  <Text style={styles.orderTime}>
                    {formatRelativeTime(o?.createdAt ?? '')}
                  </Text>
                  <PaymentBadge title={o?.paymentMethod} />
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerLeft: {flex: 1, paddingRight: spacing.md},
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  storeName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  dateChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: radii.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  heroAmount: {
    marginTop: spacing.sm,
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  heroBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  heroCta: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  heroCtaText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickCard: {
    width: 76,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickEmoji: {fontSize: 22},
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertIconText: {fontSize: 18},
  alertBody: {flex: 1},
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  alertSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  alertChevron: {
    fontSize: 24,
    color: colors.orange,
    fontWeight: '300',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  emptyText: {
    marginTop: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  orderMeta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  orderRight: {alignItems: 'flex-end'},
  orderAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  orderTime: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 4,
  },
});
