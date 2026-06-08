import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  mapApiNotification,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../services/notificationsApi';
import {
  BellIcon,
  CheckIcon,
  PaymentBadge,
  TopHeader,
  TopHeaderAction,
} from '../components/ui';
import type { NotificationListItem } from '../services/notificationsApi';
import { colors, cardShadow, radii, spacing } from '../theme';
import type { DashboardStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'Notifications'>;

const PER_PAGE = 15;

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      return 'Just now';
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
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

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState<0 | 1>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const endReachedGuard = useRef(false);

  const { data, isFetching, isLoading, refetch } = useGetNotificationsQuery(
    {
      page,
      perPage: PER_PAGE,
      unreadOnly,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const [markRead, { isLoading: markingOne }] =
    useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const [items, setItems] = useState<NotificationListItem[]>([]);
  const prevUnreadRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setItems([]);
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [unreadOnly]);

  useEffect(() => {
    const count = data?.unreadCount ?? 0;
    if (count > prevUnreadRef.current) {
      setPage(1);
      setItems([]);
      void refetch();
    }
    prevUnreadRef.current = count;
  }, [data?.unreadCount, refetch]);

  useEffect(() => {
    const mapped = (data?.notifications ?? []).map(mapApiNotification);
    if (page === 1) {
      setItems(mapped);
    } else {
      setItems(prev => {
        const ids = new Set(prev.map(n => n.id));
        const extra = mapped.filter(n => !ids.has(n.id));
        return extra.length ? [...prev, ...extra] : prev;
      });
    }
    if (!isFetching) {
      setIsLoadingMore(false);
    }
  }, [data?.notifications, page, isFetching]);

  const unreadCount = data?.unreadCount ?? 0;
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const hasMore = page < totalPages;

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead().unwrap();
      setPage(1);
    } catch {
      // RTK shows error via hook if needed later
    }
  }, [markAllRead]);

  const handlePressItem = useCallback(
    async (id: string, isRead: boolean) => {
      if (!isRead) {
        try {
          await markRead(id).unwrap();
        } catch {
          return;
        }
      }
    },
    [markRead],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isFetching) {
      return;
    }
    setIsLoadingMore(true);
    setPage(p => p + 1);
  }, [hasMore, isLoadingMore, isFetching]);

  const handleEndReached = useCallback(() => {
    if (endReachedGuard.current) {
      return;
    }
    endReachedGuard.current = true;
    loadMore();
  }, [loadMore]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setItems([]);
    void refetch();
  }, [refetch]);

  const busy = markingOne || markingAll;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread`
              : 'All caught up'
          }
          onBack={() => navigation.goBack()}
          right={
            unreadCount > 0 ? (
              <TopHeaderAction
                label="Mark all read"
                onPress={handleMarkAllRead}
                accessibilityLabel="Mark all notifications as read"
              />
            ) : undefined
          }
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              unreadOnly === 0 && styles.filterChipActive,
            ]}
            onPress={() => {
              if (unreadOnly !== 0) {
                setUnreadOnly(0);
              }
            }}>
            <Text
              style={[
                styles.filterChipText,
                unreadOnly === 0 && styles.filterChipTextActive,
              ]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              unreadOnly === 1 && styles.filterChipActive,
            ]}
            onPress={() => {
              if (unreadOnly !== 1) {
                setUnreadOnly(1);
              }
            }}>
            <Text
              style={[
                styles.filterChipText,
                unreadOnly === 1 && styles.filterChipTextActive,
              ]}>
              Unread
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <FlatList
            style={styles.listScroll}
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && page === 1 && !isLoadingMore}
                onRefresh={onRefresh}
                colors={[colors.green]}
                tintColor={colors.green}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.25}
            onMomentumScrollBegin={() => {
              endReachedGuard.current = false;
            }}
            ListHeaderComponent={
              <View style={[styles.summaryCard, cardShadow]}>
                <View style={styles.summaryIconWrap}>
                  <BellIcon size={22} color={colors.navy} />
                </View>
                <View style={styles.summaryTextCol}>
                  <Text style={styles.summaryTitle}>Inbox</Text>
                  <Text style={styles.summarySub}>
                    {pagination?.total ?? 0} notification
                    {(pagination?.total ?? 0) === 1 ? '' : 's'} total
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <CheckIcon size={40} color={colors.green} strokeWidth={3} />
                <Text style={styles.emptyTitle}>
                  {unreadOnly === 1 ? 'No unread' : 'No notifications'}
                </Text>
                <Text style={styles.emptySub}>
                  {unreadOnly === 1
                    ? 'You have read everything'
                    : 'New alerts from the server will appear here'}
                </Text>
              </View>
            }
            ListFooterComponent={
              isLoadingMore || (isFetching && page > 1) ? (
                <View style={styles.footerWrap}>
                  <ActivityIndicator color={colors.green} />
                  <Text style={styles.footerText}>Loading more…</Text>
                </View>
              ) : hasMore && items.length > 0 ? (
                <Text style={styles.footerHint}>Scroll for more</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  cardShadow,
                  !item.isRead && styles.cardUnread,
                ]}
                activeOpacity={0.88}
                disabled={busy}
                onPress={() => handlePressItem(item.id, item.isRead)}>
                <View style={styles.cardTop}>
                  <View style={styles.titleRow}>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                    <Text
                      style={[
                        styles.cardTitle,
                        !item.isRead && styles.cardTitleUnread,
                      ]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={styles.cardWhen}>{formatWhen(item.when)}</Text>
                </View>
                {item.body ? (
                  <Text style={styles.cardBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <View style={styles.cardFooter}>
                  <PaymentBadge
                    title={item.isRead ? 'Read' : 'Unread'}
                  />
                  {item.type ? (
                    <Text style={styles.typeLabel}>{item.type}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listScroll: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIcon: { fontSize: 22 },
  summaryTextCol: { flex: 1 },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  summarySub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardUnread: {
    borderLeftColor: colors.green,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  cardTitleUnread: {
    fontWeight: '800',
  },
  cardWhen: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  cardBody: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  typeLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  footerText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginVertical: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    color: colors.green,
    fontWeight: '800',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  emptySub: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
