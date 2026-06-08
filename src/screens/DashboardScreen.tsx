import React, {useCallback, useMemo, useState} from 'react';
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppSelector} from '../useAppHooks';
import type {DashboardStackParamList} from '../navigation/types';
import {useGetOrdersQuery} from '../services/orderApi';
import {useGetNotificationsQuery} from '../services/notificationsApi';
import {useGetPosInitQuery} from '../services/posApi';
import {useGetInventoryQuery} from '../services/inventoryApi';
import {paymentBadgeLabel} from '../utils/ordersList';
import {resolveCurrencySymbol} from '../utils/currency';
import {PrinterStatusCard} from '../components/printer/PrinterStatusCard';
import {useAppMenu} from '../context/AppMenuContext';
import {ConfirmDialog, Icon, PaymentBadge} from '../components/ui';
import type {IconName} from '../components/ui';
import {colors, cardShadow, radii, spacing} from '../theme';

type DashboardNav = NativeStackNavigationProp<
  DashboardStackParamList,
  'DashboardMain'
>;

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = spacing.xl;
/** Sales hero — deep forest green from design reference */
const HERO_BG = '#006B3C';
const HERO_BADGE_BG = '#00522E';
const QUICK_GAP = 10;
const QUICK_CARD_W = (SCREEN_W - H_PAD * 2 - QUICK_GAP * 3) / 4;

const ORDER_ICON_TINTS = ['#DCFCE7', '#FFEDD5', '#EDE9FE', '#DBEAFE'];
const PREVIEW_ITEM_LIMIT = 2;

function lineItemLabel(title: string, qty: number) {
  return `${title} ×${qty}`;
}

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

function isSameDay(iso: string, ref: Date) {
  try {
    return new Date(iso).toDateString() === ref.toDateString();
  } catch {
    return false;
  }
}

type QuickAction = {
  key: string;
  label: string;
  iconName: IconName;
  bg: string;
  onPress: () => void;
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNav>();
  const tabNavigation = navigation.getParent();
  const {openMenu} = useAppMenu();
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setExitConfirmVisible(true);
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  const user = useAppSelector(state => state.authToken.user);
  const {data: posInit, isFetching, refetch} = useGetPosInitQuery();
  const {data: ordersPage, isFetching: ordersFetching, refetch: refetchOrders} =
    useGetOrdersQuery({page: 1, limit: 100});
  const orders = ordersPage?.items ?? [];
  const {data: inventory, refetch: refetchInventory} =
    useGetInventoryQuery('all');

  const storeName =
    posInit?.storeSettings?.store_name?.trim() || 'Your restaurant';
  const currency = resolveCurrencySymbol(posInit?.storeSettings?.currency);
  const lowStockCount = inventory?.statusCounts?.low ?? 0;

  const {todaySales, growthLabel, growthUp, showGrowthTrend} = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let todayTotal = 0;
    let yesterdayTotal = 0;
    for (const o of orders) {
      const amount = o?.total ?? 0;
      if (isSameDay(o.createdAt, today)) {
        todayTotal += amount;
      } else if (isSameDay(o.createdAt, yesterday)) {
        yesterdayTotal += amount;
      }
    }
    let growth: string;
    let up = true;
    if (yesterdayTotal > 0) {
      const pct = Math.round(
        ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100,
      );
      up = pct >= 0;
      growth = `${Math.abs(pct)}% from yesterday`;
    } else {
      const todayCount = orders.filter(o => isSameDay(o.createdAt, today))
        .length;
      growth = `${todayCount} order${todayCount === 1 ? '' : 's'} today`;
      up = true;
    }
    return {
      todaySales: todayTotal,
      growthLabel: growth,
      growthUp: up,
      showGrowthTrend: yesterdayTotal > 0,
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);
  const {
    data: notificationsSummary,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(
    {
      page: 1,
      perPage: 15,
      unreadOnly: 0,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const {data: unreadOnlyPage, refetch: refetchUnread} =
    useGetNotificationsQuery(
      {
        page: 1,
        perPage: 1,
        unreadOnly: 1,
      },
      {
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
    );

  const notificationUnreadCount = useMemo(() => {
    const fromSummary = notificationsSummary?.unreadCount;
    if (typeof fromSummary === 'number' && fromSummary >= 0) {
      return fromSummary;
    }
    return unreadOnlyPage?.pagination?.total ?? 0;
  }, [notificationsSummary?.unreadCount, unreadOnlyPage?.pagination?.total]);

  useFocusEffect(
    useCallback(() => {
      void refetchNotifications();
      void refetchUnread();
    }, [refetchNotifications, refetchUnread]),
  );

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
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const firstName = user?.name?.split(' ')?.[0] ?? 'Waiter';
  const initials = (user?.name ?? 'W')
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const goProfile = () =>
    tabNavigation?.navigate('Profile', {screen: 'ProfileMain'});
  const goPos = () => tabNavigation?.navigate('POS', {screen: 'PosHome'});
  const goOrders = () => tabNavigation?.navigate('Orders');
  const goNotifications = () => navigation.navigate('Notifications');

  const quickActions: QuickAction[] = [
    {
      key: 'sale',
      label: 'New Order',
      iconName: 'shopping-bag',
      bg: '#DCFCE7',
      onPress: goPos,
    },
    {
      key: 'products',
      label: 'Products',
      iconName: 'package',
      bg: '#FFEDD5',
      onPress: () =>
        tabNavigation?.navigate('Profile', {screen: 'MenuItemsList'}),
    },
    {
      key: 'customers',
      label: 'Customers',
      iconName: 'users',
      bg: '#EDE9FE',
      onPress: () =>
        tabNavigation?.navigate('Profile', {screen: 'Customers'}),
    },
    {
      key: 'bills',
      label: 'Bills',
      iconName: 'receipt',
      bg: '#DBEAFE',
      onPress: goOrders,
    },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.appBarFixed}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={openMenu}
            activeOpacity={0.8}
            accessibilityLabel="Open menu">
            <Icon name="menu" size={22} color={colors.navy} />
          </TouchableOpacity>
          <Image
            source={require('../assets/logo-dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.appBarRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={goNotifications}
              activeOpacity={0.8}
              accessibilityLabel="Notifications">
              <Icon name="bell" size={22} color={colors.navy} />
              {notificationUnreadCount > 0 ? (
                <View style={styles.badge} accessibilityLabel={`${notificationUnreadCount} unread notifications`}>
                  <Text style={styles.badgeText}>
                    {notificationUnreadCount > 9
                      ? '9+'
                      : String(notificationUnreadCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching || ordersFetching}
              onRefresh={() => {
                refetch();
                refetchOrders();
                refetchInventory();
              }}
              colors={[colors.green]}
              tintColor={colors.green}
            />
          }
          showsVerticalScrollIndicator={false}>
          {/* Greeting + date */}
          <View style={styles.greetingRow}>
            <Text style={styles.greeting} numberOfLines={2}>
              {greeting}, {firstName} 👋
            </Text>
            {/* <TouchableOpacity style={styles.dateChip} activeOpacity={0.85}>
              <Icon name="calendar" size={16} color={colors.muted} />
              <Text style={styles.dateChipText}>Today, {dateLabel}</Text>
              <Text style={styles.dateChevron}>⌄</Text>
            </TouchableOpacity> */}
          </View>

          {/* <TouchableOpacity
            style={styles.storeRow}
            onPress={goProfile}
            activeOpacity={0.85}>
            <Text style={styles.storeName} numberOfLines={1}>
              {storeName}
            </Text>
            <Text style={styles.storeChevron}>⌄</Text>
          </TouchableOpacity> */}

          {/* Today's sales hero */}
          <View style={styles.heroWrap}>
            <Image
              source={require('../assets/currency.png')}
              style={styles.heroArt}
              resizeMode="contain"
            />
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>Today&apos;s Sales</Text>
                <Icon name="info" size={18} color="rgba(255,255,255,0.85)" />
              </View>
              <Text style={styles.heroAmount}>
                {currency}
                {todaySales.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.heroBadge}>
                {showGrowthTrend ? (
                  <Icon
                    name={growthUp ? 'trending-up' : 'trending-down'}
                    size={14}
                    color="#BBF7D0"
                  />
                ) : null}
                <Text style={styles.heroBadgeText}>{growthLabel}</Text>
              </View>
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickRow}>
            {quickActions.map(a => (
              <TouchableOpacity
                key={a.key}
                style={[styles.quickCard, {width: QUICK_CARD_W},{backgroundColor: a.bg}]}
                activeOpacity={0.85}
                onPress={a.onPress}>
                <View style={[styles.quickIcon, {backgroundColor: a.bg}]}>
                  <Icon name={a.iconName} size={32} color={colors.navy} />
                </View>
                <Text style={styles.quickLabel} numberOfLines={2}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrinterStatusCard />

          {/* Low stock alert */}
          {lowStockCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                tabNavigation?.navigate('Profile', {screen: 'InventoryList'})
              }>
              <View style={styles.alertStrip}>
                <View style={styles.alertIcon}>
                  <Icon name="bell" size={18} color={colors.navy} />
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertTitle}>
                    {lowStockCount} product
                    {lowStockCount === 1 ? '' : 's'} are low in stock
                  </Text>
                  <Text style={styles.alertSub}>
                    Tap to view and restock
                  </Text>
                </View>
                <Text style={styles.alertChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Recent sales */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Sales</Text>
            <TouchableOpacity onPress={goOrders}>
              <Text style={styles.viewAll}>View All ›</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No sales yet</Text>
              <Text style={styles.emptyText}>
                Your recent orders will show here after the first sale.
              </Text>
              <TouchableOpacity style={styles.emptyCta} onPress={goPos}>
                <Text style={styles.emptyCtaText}>Start New Sale</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentOrders.map((o, index) => {
              const preview = o.items.slice(0, PREVIEW_ITEM_LIMIT);
              const moreCount = o.items.length - preview.length;
              const orderLabel =
                o.order_no?.trim() || o.tokenNo || `#${o.orderId}`;

              return (
                <TouchableOpacity
                  key={o?.id}
                  activeOpacity={0.9}
                  onPress={goOrders}>
                  <View style={styles.orderRow}>
                    <View
                      style={[
                        styles.orderIcon,
                        {
                          backgroundColor:
                            ORDER_ICON_TINTS[index % ORDER_ICON_TINTS.length],
                        },
                      ]}>
                      <Icon name="cart" size={20} color={colors.navy} />
                    </View>
                    <View style={styles.orderBody}>
                      <Text style={styles.orderTitle} numberOfLines={1}>
                        #{orderLabel}
                      </Text>
                      <Text style={styles.orderTime}>
                        {o.itemCount > 0
                          ? `${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`
                          : ''}
                      </Text>
                      <Text style={styles.orderTime}>
                        {formatRelativeTime(o.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.orderRight}>
                      <PaymentBadge title={paymentBadgeLabel(o)} />
                      <Text style={styles.orderAmount}>
                        {currency}{o.total.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={exitConfirmVisible}
        title="Exit app?"
        message="Are you sure you want to close Swadesh POS?"
        confirmLabel="Exit"
        cancelLabel="Stay"
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          BackHandler.exitApp();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safe: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + 8,
  },
  appBarFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: '#F8FAF8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
    // elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuIcon: {
    fontSize: 22,
    color: colors.navy,
    fontWeight: '600',
  },
  logo: {
    height: 36,
    width: 130,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bellIcon: {fontSize: 20},
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#F8FAF8',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  greeting: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    lineHeight: 28,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.white,
    gap: 4,
    maxWidth: SCREEN_W * 0.46,
  },
  dateChipIcon: {fontSize: 12},
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    flexShrink: 1,
  },
  dateChevron: {
    fontSize: 10,
    color: colors.muted,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    gap: 4,
    maxWidth: '85%',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  storeChevron: {
    fontSize: 12,
    color: colors.muted,
  },
  heroWrap: {
    backgroundColor: HERO_BG,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    minHeight: 168,
    justifyContent: 'center',
    ...cardShadow,
    marginTop: spacing.xl,
  },
  heroArt: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '52%',
    height: '100%',
  },
  heroContent: {
    padding: spacing.xl,
    paddingRight: SCREEN_W * 0.38,
    zIndex: 1,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroInfo: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
  },
  heroAmount: {
    marginTop: spacing.sm,
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: HERO_BADGE_BG,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  heroBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: QUICK_GAP,
  },
  quickCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...cardShadow,
  },
  quickIcon: {
    width:  48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickEmoji: {fontSize: 32},
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    lineHeight: 14,
  },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertIconText: {fontSize: 20},
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
    fontSize: 22,
    color: colors.orange,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  emptyCtaText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orderIconEmoji: {fontSize: 20},
  orderBody: {flex: 1, minWidth: 0},
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  orderTime: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  itemsPreview: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  itemPreviewLine: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: '500',
    marginTop: 2,
  },
  itemPreviewMore: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  orderRight: {alignItems: 'flex-end', marginLeft: spacing.sm},
  orderAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 15,
  },
});
