import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useDeleteInventoryItemMutation,
  useGetInventoryQuery,
  type InventoryItem,
  type InventoryStatus,
} from '../services/inventoryApi';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {
  Card,
  Icon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  TopHeader,
  TopHeaderAction,
} from '../components/ui';
import type {IconName} from '../components/ui';
import {colors, radii, spacing} from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'InventoryList'>;

const STATUS_FILTERS: {key: InventoryStatus; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'in', label: 'In stock'},
  {key: 'low', label: 'Low'},
  {key: 'out', label: 'Out'},
];

function statusStyle(status: InventoryItem['status']): {
  bg: string;
  text: string;
  label: string;
  iconName: IconName;
} {
  if (status === 'low') {
    return {bg: '#FEF3C7', text: '#B45309', label: 'Low', iconName: 'info'};
  }
  if (status === 'out') {
    return {bg: '#FEE2E2', text: '#B91C1C', label: 'Out', iconName: 'close'};
  }
  return {bg: '#DCFCE7', text: '#15803D', label: 'In stock', iconName: 'check'};
}

export const InventoryListScreen: React.FC<Props> = ({navigation, route}) => {
  const [statusFilter, setStatusFilter] = useState<InventoryStatus>('all');
  const [query, setQuery] = useState('');
  const {data, isLoading, isFetching, isError, refetch} =
    useGetInventoryQuery(statusFilter);
  const [deleteItem] = useDeleteInventoryItemMutation();

  const items = useMemo(() => {
    const list = data?.items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(item => (item.title ?? '').toLowerCase().includes(q));
  }, [data?.items, query]);

  const counts = data?.statusCounts;

  const onDelete = (item: InventoryItem) => {
    Alert.alert(
      'Delete item',
      `Remove "${item.title}" from inventory?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id).unwrap();
            } catch (e: unknown) {
              const err = e as {data?: {message?: string}};
              Alert.alert(
                'Delete failed',
                err?.data?.message ?? 'Could not delete item.',
              );
            }
          },
        },
      ],
    );
  };

  const openEdit = (item: InventoryItem) => {
    const linkedMenu = item.linked_menu_items?.[0];
    navigation.navigate('EditInventoryItem', {
      itemId: item.id,
      title: item.title,
      unit: item.unit,
      minQuantityThreshold: String(item.min_quantity_threshold ?? ''),
      quantity: String(item.quantity ?? ''),
      linkedMenuItemId: linkedMenu?.menu_item_id,
      linkedMenuItemTitle: linkedMenu?.menu_item_title,
    });
  };

  const listHeader = (
    <View style={styles.listHeader}>
      {counts ? (
        <View style={styles.statsRow}>
          <StatCard
            label="In stock"
            value={counts.in}
            tone="in"
            active={statusFilter === 'in'}
            onPress={() => setStatusFilter('in')}
          />
          <StatCard
            label="Low"
            value={counts.low}
            tone="low"
            active={statusFilter === 'low'}
            onPress={() => setStatusFilter('low')}
          />
          <StatCard
            label="Out"
            value={counts.out}
            tone="out"
            active={statusFilter === 'out'}
            onPress={() => setStatusFilter('out')}
          />
        </View>
      ) : null}

      <Card style={styles.toolsCard}>
        <View style={styles.searchWrap}>
          <SearchIcon size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory…"
            placeholderTextColor={colors.mutedLight}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.resultCount}>
          {items.length} item{items.length === 1 ? '' : 's'}
          {statusFilter !== 'all' ? ` · ${STATUS_FILTERS.find(f => f.key === statusFilter)?.label}` : ''}
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Inventory"
          subtitle="Stock levels & raw materials"
          onBack={() =>
            handleProfileStackBack(navigation, route.params?.fromSideMenu)
          }
          right={
            <TopHeaderAction
              label="+ Add"
              onPress={() => navigation.navigate('AddInventoryItem')}
            />
          }
        />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Card style={styles.emptyCard}>
              <PackageIcon size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>Could not load inventory</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={listHeader}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={refetch}
                colors={[colors.green]}
                tintColor={colors.green}
              />
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <PackageIcon size={44} color={colors.muted} />
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptyText}>
                  {query.trim()
                    ? 'Try a different search or clear filters.'
                    : 'Add your first inventory item to track stock.'}
                </Text>
                {!query.trim() && statusFilter === 'all' ? (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => navigation.navigate('AddInventoryItem')}>
                    <Text style={styles.retryText}>+ Add item</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            }
            renderItem={({item}) => (
              <InventoryRow
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => onDelete(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

function StatCard({
  label,
  value,
  tone,
  active,
  onPress,
}: {
  label: string;
  value: number;
  tone: 'in' | 'low' | 'out';
  active: boolean;
  onPress: () => void;
}) {
  const toneStyle =
    tone === 'low'
      ? styles.statLow
      : tone === 'out'
        ? styles.statOut
        : styles.statIn;

  return (
    <TouchableOpacity
      style={[styles.statCard, toneStyle, active && styles.statCardActive]}
      onPress={onPress}
      activeOpacity={0.88}>
      <Text style={[styles.statValue, active && styles.statValueActive]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, active && styles.statLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InventoryRow({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = statusStyle(item.status);
  const isLow = item.status === 'low' || item.status === 'out';

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, {backgroundColor: badge.bg}]}>
          <Icon name={badge.iconName} size={18} color={badge.text} />
        </View>
        <TouchableOpacity
          style={styles.itemBody}
          onPress={onEdit}
          activeOpacity={0.85}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: badge.bg}]}>
              <Text style={[styles.statusBadgeText, {color: badge.text}]}>
                {badge.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.itemQty, isLow && styles.itemQtyAlert]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={styles.itemMeta}>
            Alert below {item.min_quantity_threshold} {item.unit}
          </Text>
          {item.linked_menu_items?.length ? (
            <Text style={styles.itemLinked} numberOfLines={1}>
              Linked:{' '}
              {item.linked_menu_items.map(m => m.menu_item_title).join(', ')}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          activeOpacity={0.85}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safe: {flex: 1},
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardActive: {
    borderColor: colors.navy,
  },
  statIn: {backgroundColor: '#DCFCE7'},
  statLow: {backgroundColor: '#FEF3C7'},
  statOut: {backgroundColor: '#FEE2E2'},
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  statValueActive: {
    color: colors.navy,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  statLabelActive: {
    color: colors.navy,
  },
  toolsCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.navy,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.green,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  itemCard: {
    padding: spacing.lg,
  },
  itemTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemQty: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: colors.green,
  },
  itemQtyAlert: {
    color: colors.orange,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  itemLinked: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedLight,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
});
