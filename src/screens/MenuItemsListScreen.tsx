import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useGetPosInitQuery, type MenuItem} from '../services/posApi';
import {resolveMediaUrl} from '../services/menuApi';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {
  Card,
  SearchIcon,
  TopHeader,
  TopHeaderAction,
  UtensilsIcon,
} from '../components/ui';
import {colors, radii, spacing} from '../theme';
import {resolveCurrencySymbol} from '../utils/currency';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MenuItemsList'>;

const ALL_CATEGORIES = '__all__';

export const MenuItemsListScreen: React.FC<Props> = ({navigation, route}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const {data, isLoading, isFetching, isError, refetch} = useGetPosInitQuery();

  const menuItems = data?.menuItems ?? [];
  const currency = resolveCurrencySymbol(data?.storeSettings?.currency);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of menuItems) {
      const title = item.category_title?.trim();
      if (title) {
        map.set(String(item.category_id), title);
      }
    }
    return Array.from(map.entries())
      .map(([id, title]) => ({id, title}))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [menuItems]);

  const stats = useMemo(() => {
    const enabled = menuItems.filter(m => m.is_enabled).length;
    return {
      total: menuItems.length,
      enabled,
      disabled: menuItems.length - enabled,
      categories: categories.length,
    };
  }, [menuItems, categories.length]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter(item => {
      if (categoryFilter !== ALL_CATEGORIES) {
        if (String(item.category_id) !== categoryFilter) {
          return false;
        }
      }
      if (!q) {
        return true;
      }
      const title = (item.title ?? '').toLowerCase();
      const category = (item.category_title ?? '').toLowerCase();
      return title.includes(q) || category.includes(q);
    });
  }, [menuItems, query, categoryFilter]);

  const openEdit = (item: MenuItem) => {
    const itemId = String(item.id ?? '');
    navigation.navigate('EditMenuItem', {
      menuItemId: itemId,
      title: item.title ?? '',
      description: item.description ?? '',
      price: String(item.price ?? ''),
      netPrice: String(item.net_price ?? item.price ?? ''),
      categoryId: String(item.category_id ?? ''),
      taxId: String(item.tax_id ?? ''),
      image: item.image,
      automaticInventoryEnabled: Boolean(
        item.automatic_inventory_enabled ?? item.automaticInventoryEnabled,
      ),
    });
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statTotal]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Dishes</Text>
        </View>
        <View style={[styles.statCard, styles.statActive]}>
          <Text style={styles.statValue}>{stats.enabled}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, styles.statCat]}>
          <Text style={styles.statValue}>{stats.categories}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      <Card style={styles.toolsCard}>
        <View style={styles.searchWrap}>
          <SearchIcon size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or category…"
            placeholderTextColor={colors.mutedLight}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {categories.length > 0 ? (
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                categoryFilter === ALL_CATEGORIES && styles.filterChipActive,
              ]}
              onPress={() => setCategoryFilter(ALL_CATEGORIES)}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.filterText,
                  categoryFilter === ALL_CATEGORIES && styles.filterTextActive,
                ]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(cat => {
              const active = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setCategoryFilter(cat.id)}
                  activeOpacity={0.85}>
                  <Text
                    style={[styles.filterText, active && styles.filterTextActive]}
                    numberOfLines={1}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.resultCount}>
          {items.length} item{items.length === 1 ? '' : 's'}
          {categoryFilter !== ALL_CATEGORIES
            ? ` · ${categories.find(c => c.id === categoryFilter)?.title ?? ''}`
            : ''}
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Menu items"
          subtitle="Manage dishes for POS"
          onBack={() =>
            handleProfileStackBack(navigation, route.params?.fromSideMenu)
          }
          right={
            <TopHeaderAction
              label="+ Add"
              onPress={() => navigation.navigate('CreateMenuItem')}
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
              <UtensilsIcon size={44} color={colors.muted} />
              <Text style={styles.emptyTitle}>Could not load menu</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={refetch}>
                <Text style={styles.primaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
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
                <UtensilsIcon size={44} color={colors.muted} />
                <Text style={styles.emptyTitle}>No dishes found</Text>
                <Text style={styles.emptyText}>
                  {query.trim() || categoryFilter !== ALL_CATEGORIES
                    ? 'Try another search or category filter.'
                    : 'Add your first menu item to show it on POS.'}
                </Text>
                {!query.trim() && categoryFilter === ALL_CATEGORIES ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => navigation.navigate('CreateMenuItem')}>
                    <Text style={styles.primaryBtnText}>+ Add dish</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            }
            renderItem={({item}) => (
              <MenuItemRow
                item={item}
                currency={currency}
                onPress={() => openEdit(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

function MenuItemRow({
  item,
  currency,
  onPress,
}: {
  item: MenuItem;
  currency: string;
  onPress: () => void;
}) {
  const imageUri = item.image
    ? resolveMediaUrl(item.image) || item.image
    : null;
  const net = Number(item.net_price || item.price || 0);
  const mrp = Number(item.price || 0);
  const showMrp = mrp > net + 0.009;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <Card
        style={
          item.is_enabled
            ? styles.itemCard
            : StyleSheet.flatten([styles.itemCard, styles.itemCardDisabled])
        }>
        <View style={styles.itemRow}>
          {imageUri ? (
            <Image
              source={{uri: imageUri}}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPh]}>
              <UtensilsIcon size={22} color={colors.muted} />
            </View>
          )}

          <View style={styles.itemBody}>
            <View style={styles.itemTitleRow}>
              <Text
                style={[styles.itemTitle, !item.is_enabled && styles.textMuted]}
                numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_enabled ? (
                <View style={styles.offBadge}>
                  <Text style={styles.offBadgeText}>Off</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.categoryPill} numberOfLines={1}>
              {item.category_title ?? 'Uncategorized'}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.netPrice}>
                {currency} {net.toFixed(2)}
              </Text>
              {showMrp ? (
                <Text style={styles.mrpPrice}>
                  {currency} {mrp.toFixed(2)}
                </Text>
              ) : null}
            </View>

            {item.tax_title ? (
              <Text style={styles.taxLine} numberOfLines={1}>
                {item.tax_title} ({item.tax_rate}%)
              </Text>
            ) : null}
          </View>

          <Text style={styles.chevron}>›</Text>
        </View>
      </Card>
    </TouchableOpacity>
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
    alignItems: 'center',
  },
  statTotal: {backgroundColor: '#EFF6FF'},
  statActive: {backgroundColor: '#DCFCE7'},
  statCat: {backgroundColor: '#FFEDD5'},
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
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
    maxWidth: '48%',
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
  primaryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.green,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemCardDisabled: {
    opacity: 0.72,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.borderLight,
  },
  thumbPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPhText: {
    fontSize: 28,
    opacity: 0.35,
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
  textMuted: {
    color: colors.muted,
  },
  offBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  offBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
  },
  netPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.green,
  },
  mrpPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  taxLine: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedLight,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: colors.mutedLight,
    fontWeight: '300',
  },
});
