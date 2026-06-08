import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useCancelOrdersMutation,
  useGetOrdersQuery,
  useRemoveOrderItemMutation,
  type OrderListItem,
} from '../services/orderApi';
import { useGetConfigQuery } from '../services/configApi';
import { useGetPosInitQuery } from '../services/posApi';
import { resolveCurrencySymbol } from '../utils/currency';
import { paymentBadgeLabel } from '../utils/ordersList';
import {
  Card,
  CheckIcon,
  CartIcon,
  ClipboardIcon,
  CloseIcon,
  FilterIcon,
  PaymentBadge,
  ScreenBackground,
  TopHeader,
} from '../components/ui';
import { colors, getBrandHeroColors, radii, spacing, typography } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, ProfileStackParamList } from '../navigation/types';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Created', value: 'created' },
  { label: 'Cancelled', value: 'cancelled' },
];

const DELIVERY_FILTERS: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'Dine-in', value: 'dinein' },
  { label: 'Takeaway', value: 'takeaway' },
  { label: 'Delivery', value: 'delivery' },
];

const FILTER_SIDEBAR_W = Math.min(120, Dimensions.get('window').width * 0.32);

type FilterSection = 'status' | 'delivery';

const FILTER_SECTIONS: { key: FilterSection; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'delivery', label: 'Service' },
];

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

function isOrderEditable(order: OrderListItem) {
  const status = order.status?.toLowerCase() ?? '';
  return status !== 'cancelled' && status !== 'canceled';
}

type BrandAccent = ReturnType<typeof getBrandHeroColors>;

type FilterOptionRowProps = {
  label: string;
  selected: boolean;
  brand: BrandAccent;
  onPress: () => void;
};

function FilterOptionRow({
  label,
  selected,
  brand,
  onPress,
}: FilterOptionRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.filterOptionRow,
        selected && {
          backgroundColor: `${brand.hero}18`,
          borderColor: brand.hero,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}>
      <Text
        style={[
          styles.filterOptionLabel,
          selected && { color: brand.heroDark, fontWeight: '800' },
        ]}>
        {label}
      </Text>
      {selected ? (
        <CheckIcon size={18} color={brand.hero} strokeWidth={3} />
      ) : null}
    </TouchableOpacity>
  );
}

type OrdersFilterPanelProps = {
  visible: boolean;
  section: FilterSection;
  draftStatus?: string;
  draftDelivery?: string;
  onSelectSection: (section: FilterSection) => void;
  onDraftStatus: (value?: string) => void;
  onDraftDelivery: (value?: string) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
};

function OrdersFilterPanel({
  visible,
  section,
  draftStatus,
  draftDelivery,
  onSelectSection,
  onDraftStatus,
  onDraftDelivery,
  onClose,
  onReset,
  onApply,
}: OrdersFilterPanelProps) {
  const insets = useSafeAreaInsets();
  const { data: appConfig } = useGetConfigQuery();
  const brand = useMemo(
    () => getBrandHeroColors(appConfig?.data?.branding),
    [appConfig?.data?.branding?.primary_color],
  );
  const options =
    section === 'status' ? STATUS_FILTERS : DELIVERY_FILTERS;
  const draftValue = section === 'status' ? draftStatus : draftDelivery;
  const onSelect =
    section === 'status' ? onDraftStatus : onDraftDelivery;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.filterPanelRoot}>
        <SafeAreaView style={styles.filterSidebar} edges={['top', 'left', 'bottom']}>
          <Text style={styles.filterSidebarTitle}>Filters</Text>
          {FILTER_SECTIONS.map(s => {
            const hasValue =
              s.key === 'status'
                ? draftStatus != null
                : draftDelivery != null;
            const active = section === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.filterSidebarItem,
                  active && {
                    backgroundColor: colors.white,
                    borderLeftColor: brand.hero,
                  },
                ]}
                onPress={() => onSelectSection(s.key)}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.filterSidebarItemText,
                    active && styles.filterSidebarItemTextActive,
                  ]}>
                  {s.label}
                </Text>
                {hasValue ? (
                  <View
                    style={[styles.filterSidebarDot, { backgroundColor: brand.hero }]}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>

        <View style={styles.filterMain}>
          <SafeAreaView style={styles.filterMainSafe} edges={['top', 'right']}>
            <View style={styles.filterMainHeader}>
              <Text style={styles.filterMainTitle}>
                {section === 'status' ? 'Order status' : 'Service type'}
              </Text>
              <TouchableOpacity
                style={styles.filterCloseBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseIcon size={22} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterOptionsScroll}
              contentContainerStyle={styles.filterOptionsContent}
              showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <FilterOptionRow
                  key={opt.label}
                  label={opt.label}
                  brand={brand}
                  selected={draftValue === opt.value}
                  onPress={() => onSelect(opt.value)}
                />
              ))}
            </ScrollView>

            <View
              style={[
                styles.filterFooter,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={onReset}
                activeOpacity={0.85}>
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterApplyBtn, { backgroundColor: brand.hero }]}
                onPress={onApply}
                activeOpacity={0.9}>
                <Text style={styles.filterApplyText}>Done</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function filterSummaryLabel(
  options: { label: string; value?: string }[],
  value?: string,
) {
  if (!value) {
    return null;
  }
  return options.find(o => o.value === value)?.label ?? value;
}

type OrderDetailModalProps = {
  order: OrderListItem | null;
  currency: string;
  onClose: () => void;
  onOrdersChanged: () => Promise<void>;
};

function OrderDetailModal({
  order,
  currency,
  onClose,
  onOrdersChanged,
}: OrderDetailModalProps) {
  const [removeOrderItem, { isLoading: removingItem }] =
    useRemoveOrderItemMutation();
  const [cancelOrders, { isLoading: cancelling }] = useCancelOrdersMutation();
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);

  const modalItemsListHeight = useMemo(() => {
    const { height: windowHeight } = Dimensions.get('window');
    const sheetMax = windowHeight * 0.88;
    const reserved = 340;
    return Math.min(360, Math.max(180, sheetMax - reserved));
  }, []);

  if (!order) {
    return null;
  }

  const editable = isOrderEditable(order);
  const busy = removingItem || cancelling || removingLineId != null;

  const linesTotal = order.items.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );

  const runRemoveItem = async (
    line: OrderListItem['items'][0],
    removeQuantity: number,
  ) => {
    setRemovingLineId(line.id);
    try {
      const res = await removeOrderItem({
        itemId: line.id,
        removeQuantity,
      }).unwrap();
      await onOrdersChanged();
      if (res.removedAll && res.remainingQuantity === 0) {
        Alert.alert('Item removed', res.message ?? 'Line item removed.');
      }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; error?: string };
      Alert.alert(
        'Could not remove item',
        err?.data?.message ?? err?.error ?? 'Please try again.',
      );
    } finally {
      setRemovingLineId(null);
    }
  };

  const confirmRemoveLine = (line: OrderListItem['items'][0]) => {
    const qty = line.quantity;
    if (qty <= 1) {
      Alert.alert(
        'Remove item',
        `Remove "${line.title}" from this order?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => void runRemoveItem(line, 1),
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Remove item',
      `"${line.title}" · ×${qty}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove 1',
          onPress: () => void runRemoveItem(line, 1),
        },
        {
          text: `Remove all (${qty})`,
          style: 'destructive',
          onPress: () => void runRemoveItem(line, qty),
        },
      ],
    );
  };

  const confirmCancelOrder = () => {
    Alert.alert(
      'Cancel order',
      `Cancel order ${order.tokenNo}? This cannot be undone.`,
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: () => void runCancelOrder(),
        },
      ],
    );
  };

  const runCancelOrder = async () => {
    try {
      const res = await cancelOrders({
        orderIds: [String(order.orderId)],
      }).unwrap();
      await onOrdersChanged();
      onClose();
      Alert.alert('Order cancelled', res.message ?? 'Order cancelled.');
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; error?: string };
      Alert.alert(
        'Cancel failed',
        err?.data?.message ?? err?.error ?? 'Please try again.',
      );
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{order.customerName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseIcon size={22} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMetaRow}>
              <PaymentBadge title={paymentBadgeLabel(order)} />
              <Text style={styles.modalMetaTime}>
                {formatTime(order.createdAt)}
              </Text>
            </View>

            {(order.tableTitle || order.waiterName) && (
              <Text style={styles.modalMetaExtra} numberOfLines={2}>
                {[order.tableTitle, order.waiterName]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}

            <Text style={styles.modalSectionLabel}>Order items</Text>
            <View
              style={[
                styles.modalItemsContainer,
                { height: modalItemsListHeight },
              ]}>
              <FlatList
                data={order.items}
                keyExtractor={line => line.id}
                style={styles.modalItemsScroll}
                contentContainerStyle={
                  order.items.length === 0
                    ? styles.modalItemsContentEmpty
                    : styles.modalItemsContent
                }
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                bounces
                ListEmptyComponent={
                  <Text style={styles.modalEmptyItems}>No line items</Text>
                }
                renderItem={({ item: line }) => {
                const lineRemoving = removingLineId === line.id;
                return (
                  <View style={styles.modalLineRow}>
                    <View style={styles.modalLineBody}>
                      <Text style={styles.modalLineTitle}>{line.title}</Text>
                      {line.variantTitle ? (
                        <Text style={styles.modalLineVariant}>
                          {line.variantTitle}
                        </Text>
                      ) : null}
                      {line.notes ? (
                        <Text style={styles.modalLineNotes}>{line.notes}</Text>
                      ) : null}
                    </View>
                    <View style={styles.modalLineRight}>
                      <Text style={styles.modalLineQty}>×{line.quantity}</Text>
                      <Text style={styles.modalLinePrice}>
                        {currency}
                        {(line.price * line.quantity).toFixed(2)}
                      </Text>
                      {editable ? (
                        <TouchableOpacity
                          style={styles.modalLineRemoveBtn}
                          onPress={() => confirmRemoveLine(line)}
                          disabled={busy}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          {lineRemoving ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.error}
                            />
                          ) : (
                            <Text style={styles.modalLineRemoveText}>
                              Remove
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              }}
              />
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterLabel}>
                {order.items.length} item
                {order.items.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.modalFooterTotal}>
                {currency}{order.total.toFixed(2)}
              </Text>
              {linesTotal > 0 && Math.abs(linesTotal - order.total) > 0.01 ? (
                <Text style={styles.modalFooterHint}>
                  Lines subtotal {currency} {linesTotal.toFixed(2)}
                </Text>
              ) : null}
              {order.dueAmount > 0 && order.paymentStatus === 'pending' ? (
                <Text style={styles.modalDue}>
                  Due {currency} {order.dueAmount.toFixed(2)}
                </Text>
              ) : null}
            </View>

            {editable ? (
              <TouchableOpacity
                style={[
                  styles.modalCancelOrderBtn,
                  busy && styles.modalCancelOrderBtnDisabled,
                ]}
                onPress={confirmCancelOrder}
                disabled={busy}
                activeOpacity={0.88}>
                {cancelling ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <Text style={styles.modalCancelOrderText}>Cancel entire order</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.modalCancelledHint}>
                This order is cancelled and cannot be changed.
              </Text>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

export const OrdersScreen: React.FC<NativeStackScreenProps<MainTabParamList, 'Orders'>> = ({ navigation }) => {
  const { data: posInit } = useGetPosInitQuery();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deliveryFilter, setDeliveryFilter] = useState<string | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<FilterSection>('status');
  const [draftStatus, setDraftStatus] = useState<string | undefined>();
  const [draftDelivery, setDraftDelivery] = useState<string | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(
    null,
  );

  const activeFilterCount = [statusFilter, deliveryFilter].filter(Boolean).length;

  const openFilters = useCallback(() => {
    setDraftStatus(statusFilter);
    setDraftDelivery(deliveryFilter);
    setFilterSection('status');
    setFiltersOpen(true);
  }, [statusFilter, deliveryFilter]);

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const applyFilters = useCallback(() => {
    setPage(1);
    setStatusFilter(draftStatus);
    setDeliveryFilter(draftDelivery);
    setFiltersOpen(false);
  }, [draftStatus, draftDelivery]);

  const resetDraftFilters = useCallback(() => {
    setDraftStatus(undefined);
    setDraftDelivery(undefined);
  }, []);

  const clearAppliedFilters = useCallback(() => {
    setPage(1);
    setStatusFilter(undefined);
    setDeliveryFilter(undefined);
    setDraftStatus(undefined);
    setDraftDelivery(undefined);
  }, []);

  const appliedFilterLabels = useMemo(() => {
    const parts: string[] = [];
    const statusLabel = filterSummaryLabel(STATUS_FILTERS, statusFilter);
    const deliveryLabel = filterSummaryLabel(
      DELIVERY_FILTERS,
      deliveryFilter,
    );
    if (statusLabel) {
      parts.push(statusLabel);
    }
    if (deliveryLabel) {
      parts.push(deliveryLabel);
    }
    return parts;
  }, [statusFilter, deliveryFilter]);

  const queryArgs = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(deliveryFilter ? { deliveryType: deliveryFilter } : {}),
    }),
    [page, statusFilter, deliveryFilter],
  );

  const {
    data: ordersPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetOrdersQuery(queryArgs);

  const orders = ordersPage?.items ?? [];
  const hasMore = ordersPage?.hasMore ?? false;
  const totalCount = ordersPage?.total;
  const currency = resolveCurrencySymbol(posInit?.storeSettings?.currency);

  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + (o?.total ?? 0), 0),
    [orders],
  );

  const pendingCount = useMemo(
    () => orders.filter(o => o.paymentStatus === 'pending').length,
    [orders],
  );

  const countLabel =
    totalCount != null
      ? `${orders.length} / ${totalCount}`
      : String(orders.length);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching || isLoading) {
      return;
    }
    setPage(prev => prev + 1);
  }, [hasMore, isFetching, isLoading]);

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const syncSelectedOrderAfterChange = useCallback(async () => {
    const result = await refetch();
    const items = result.data?.items;
    if (!items) {
      return;
    }
    setSelectedOrder(prev => {
      if (!prev) {
        return null;
      }
      const updated = items.find(
        o => o.orderId === prev.orderId || o.id === prev.id,
      );
      if (!updated) {
        return null;
      }
      if (!isOrderEditable(updated)) {
        return null;
      }
      return updated;
    });
  }, [refetch]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Order history"
          showBack={true}
          onBack={() => { navigation.goBack(); }}
          right={
            <TouchableOpacity
              style={styles.filterTrigger}
              onPress={openFilters}
              activeOpacity={0.85}
              accessibilityLabel="Open filters">
              <FilterIcon size={20} color={colors.navy} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterTriggerBadge}>
                  <Text style={styles.filterTriggerBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          }
        />

        {appliedFilterLabels.length > 0 ? (
          <View style={styles.appliedFiltersBar}>
            <TouchableOpacity
              style={styles.appliedFiltersMain}
              onPress={openFilters}
              activeOpacity={0.85}>
              <Text style={styles.appliedFiltersText} numberOfLines={1}>
                {appliedFilterLabels.join(' · ')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openFilters}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              activeOpacity={0.85}>
              <Text style={styles.appliedFiltersEdit}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAppliedFilters}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              activeOpacity={0.85}>
              <Text style={styles.appliedFiltersClear}>Clear</Text>
            </TouchableOpacity>

          </View>
        ) : null}

        {orders.length > 0 && (
          <Card style={styles.summaryStrip}>
            <View>
              <Text style={styles.summaryLabel}>Today&apos;s total</Text>
              <Text style={styles.summaryValue}>
                {currency}{totalRevenue.toFixed(2)}
              </Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Today&apos;s orders</Text>
              <Text style={styles.summaryValue}>
                {countLabel}
              </Text>
            </View>
            <Text style={styles.summaryHint}>
              {pendingCount > 0
                ? `${pendingCount} pending in list`
                : hasMore
                  ? 'Scroll for more orders'
                  : 'Loaded orders'}
            </Text>
          </Card>
        )}

        {isLoading && orders.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && page === 1 && !isLoading}
                onRefresh={onRefresh}
                tintColor={colors.green}
              />
            }
            ListFooterComponent={
              orders.length > 0 ? (
                <View style={styles.listFooter}>
                  {isFetching && page > 1 ? (
                    <ActivityIndicator color={colors.green} />
                  ) : hasMore ? (
                    <Text style={styles.listFooterText}>
                      Scroll down to load more
                    </Text>
                  ) : (
                    <Text style={styles.listFooterText}>End of list</Text>
                  )}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <ClipboardIcon size={44} color={colors.muted} />
                <Text style={styles.emptyTitle}>
                  {isError ? 'Could not load orders' : 'No orders yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {isError
                    ? 'Pull down to retry or check your connection.'
                    : 'Orders placed from POS will appear here with token and total.'}
                </Text>
              </Card>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setSelectedOrder(item)}>
                <Card style={styles.orderCard}>
                  <View
                    style={[styles.orderIcon, { backgroundColor: '#DCFCE7' }]}>
                    <CartIcon size={20} color={colors.navy} />
                  </View>
                  <View style={styles.orderBody}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderTitle}>{item.tokenNo}</Text>
                      <PaymentBadge title={paymentBadgeLabel(item)} />
                    </View>
                    <Text style={styles.customerName} numberOfLines={2}>
                      {item.customerName}
                    </Text>
                    <Text style={styles.metaText}>
                      {item.itemCount} item{item.itemCount === 1 ? '' : 's'}{' '}
                      · {formatTime(item.createdAt)}
                      {item.waiterName ? ` · ${item.waiterName}` : ''}
                    </Text>

                    <View style={styles.amountRow}>
                      <Text style={styles.amountValue}>
                        {currency}{item.total.toFixed(2)}
                      </Text>
                      {item.dueAmount > 0 &&
                        item.paymentStatus === 'pending' ? (
                        <Text style={styles.dueText}>
                          Due {currency}{item.dueAmount.toFixed(2)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}

        <OrderDetailModal
          order={selectedOrder}
          currency={currency}
          onClose={() => setSelectedOrder(null)}
          onOrdersChanged={syncSelectedOrderAfterChange}
        />

        <OrdersFilterPanel
          visible={filtersOpen}
          section={filterSection}
          draftStatus={draftStatus}
          draftDelivery={draftDelivery}
          onSelectSection={setFilterSection}
          onDraftStatus={setDraftStatus}
          onDraftDelivery={setDraftDelivery}
          onClose={closeFilters}
          onReset={resetDraftFilters}
          onApply={applyFilters}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  filterTrigger: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTriggerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  filterTriggerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
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
    fontSize: 14,
    fontWeight: '800',
  },
  appliedFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  appliedFiltersMain: {
    flex: 1,
    minWidth: 0,
  },
  appliedFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  appliedFiltersEdit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  appliedFiltersClear: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  filterPanelRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.white,
  },
  filterSidebar: {
    width: FILTER_SIDEBAR_W,
    backgroundColor: colors.borderLight,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.md,
  },
  filterSidebarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterSidebarItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  filterSidebarItemTextActive: {
    color: colors.navy,
    fontWeight: '800',
  },
  filterSidebarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterMain: {
    flex: 1,
    backgroundColor: colors.white,
  },
  filterMainSafe: {
    flex: 1,
  },
  filterMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  filterCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCloseText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '700',
  },
  filterOptionsScroll: {
    flex: 1,
  },
  filterOptionsContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  filterOptionCheck: {
    fontSize: 16,
    fontWeight: '800',
  },
  filterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterResetText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  filterApplyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  listFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  summaryStrip: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  summaryHint: { fontSize: 12, color: colors.muted, maxWidth: '42%', alignSelf: 'flex-start' },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  emptyCard: {
    marginTop: spacing.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.navy },
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
  orderBody: { flex: 1 },
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
    flex: 1,
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
  itemsPreview: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemPreviewLine: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '500',
    marginTop: 2,
  },
  itemPreviewMore: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
  amountRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  dueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  modalSafe: {
    flexShrink: 1,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  modalSub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '700',
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalMetaTime: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  modalMetaExtra: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.muted,
  },
  modalSectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalItemsContainer: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  modalItemsScroll: {
    flex: 1,
  },
  modalItemsContent: {
    paddingBottom: spacing.xs,
  },
  modalItemsContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalEmptyItems: {
    fontSize: 14,
    color: colors.muted,
    paddingVertical: spacing.lg,
  },
  modalLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalLineBody: { flex: 1, paddingRight: spacing.md },
  modalLineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  modalLineVariant: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  modalLineNotes: {
    marginTop: 4,
    fontSize: 12,
    color: colors.orange,
    fontStyle: 'italic',
  },
  modalLineRight: { alignItems: 'flex-end' },
  modalLineQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  modalLinePrice: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  modalLineRemoveBtn: {
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    backgroundColor: colors.errorBg,
    minWidth: 64,
    alignItems: 'center',
  },
  modalLineRemoveText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.error,
  },
  modalFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalFooterLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  modalFooterTotal: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: colors.green,
  },
  modalFooterHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },
  modalDue: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.orange,
  },
  modalCancelOrderBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCancelOrderBtnDisabled: {
    opacity: 0.6,
  },
  modalCancelOrderText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.error,
  },
  modalCancelledHint: {
    marginTop: spacing.lg,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
