import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  type InventoryDetailPeriod,
  type InventoryMovement,
  type InventoryMovementTypeFilter,
  type StockMovementType,
  useAddStockMovementMutation,
  useGetInventoryDetailQuery,
} from '../services/inventoryApi';
import type {ProfileStackParamList} from '../navigation/types';
import {
  Card,
  CloseIcon,
  GradientButton,
  Icon,
  PlusIcon,
  TopHeader,
} from '../components/ui';
import {showDialog} from '../context/DialogProvider';
import {colors, radii, spacing} from '../theme';
import {
  isTablet,
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<ProfileStackParamList, 'InventoryDetail'>;

const PERIOD_FILTERS: {key: InventoryDetailPeriod; label: string}[] = [
  {key: 'today', label: 'Today'},
  {key: 'yesterday', label: 'Yesterday'},
  {key: 'last_7days', label: '7 days'},
  {key: 'this_month', label: 'This month'},
  {key: 'last_month', label: 'Last month'},
];

const MOVEMENT_FILTERS: {key: InventoryMovementTypeFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'in', label: 'In'},
  {key: 'out', label: 'Out'},
  {key: 'wastage', label: 'Wastage'},
];

const MOVEMENT_ACTIONS: {
  key: StockMovementType;
  label: string;
  hint: string;
  color: string;
  bg: string;
}[] = [
  {
    key: 'IN',
    label: 'Stock in',
    hint: 'Add quantity',
    color: '#15803D',
    bg: '#DCFCE7',
  },
  {
    key: 'OUT',
    label: 'Stock out',
    hint: 'Remove quantity',
    color: '#B45309',
    bg: '#FEF3C7',
  },
  {
    key: 'WASTAGE',
    label: 'Wastage',
    hint: 'Record loss',
    color: '#B91C1C',
    bg: '#FEE2E2',
  },
];

function formatMovementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function movementStyle(type: StockMovementType) {
  if (type === 'IN') {
    return {label: 'In', color: '#15803D', bg: '#DCFCE7', prefix: '+'};
  }
  if (type === 'WASTAGE') {
    return {label: 'Wastage', color: '#B91C1C', bg: '#FEE2E2', prefix: '-'};
  }
  return {label: 'Out', color: '#B45309', bg: '#FEF3C7', prefix: '-'};
}

export const InventoryDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {itemId, title, unit} = route.params;
  const [period, setPeriod] = useState<InventoryDetailPeriod>('last_7days');
  const [movementFilter, setMovementFilter] =
    useState<InventoryMovementTypeFilter>('all');
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const {data, isLoading, isFetching, isError, refetch} =
    useGetInventoryDetailQuery({
      id: itemId,
      type: period,
      movementType: movementFilter,
    });
  const [addStockMovement, {isLoading: savingMovement}] =
    useAddStockMovementMutation();

  const summary = data?.summary;
  const item = data?.item;
  const movements = data?.movements ?? [];
  const displayUnit = item?.unit ?? unit;

  const linkedLabel = useMemo(() => {
    const linked =
      data?.linkedMenuItems ??
      (item?.linked_menu_item ? [item.linked_menu_item] : []);
    if (!linked.length) {
      return null;
    }
    return linked.map(m => m.menu_item_title).join(', ');
  }, [data?.linkedMenuItems, item?.linked_menu_item]);

  const openMovementModal = (type: StockMovementType) => {
    setMovementType(type);
    setQuantity('');
    setNote('');
    setMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    if (savingMovement) {
      return;
    }
    setMovementModalOpen(false);
  };

  const onSubmitMovement = async () => {
    const qty = Number(quantity.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(qty) || qty <= 0) {
      showDialog('Stock movement', 'Enter a valid quantity greater than 0.');
      return;
    }

    try {
      const res = await addStockMovement({
        id: itemId,
        movementType,
        quantity: qty,
        note: note.trim(),
      }).unwrap();
      setMovementModalOpen(false);
      showDialog('Success', res.message ?? 'Stock movement added.', [
        {text: 'OK'},
      ]);
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      showDialog(
        'Could not add movement',
        err?.data?.message ?? 'Please try again.',
      );
    }
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <Card style={styles.heroCard}>
        <Text style={styles.heroTitle}>{item?.title ?? title}</Text>
        <Text style={styles.heroStock}>
          {summary?.currentStock ?? item?.quantity ?? '—'} {displayUnit}
        </Text>
        <Text style={styles.heroMeta}>
          Alert below {item?.min_quantity_threshold ?? '—'} {displayUnit}
        </Text>
        {linkedLabel ? (
          <Text style={styles.heroLinked} numberOfLines={2}>
            Linked menu: {linkedLabel}
          </Text>
        ) : null}
      </Card>

      {summary ? (
        <View style={styles.summaryRow}>
          <SummaryChip label="Stock in" value={summary.totalIn} tone="in" />
          <SummaryChip label="Stock out" value={summary.totalOut} tone="out" />
          <SummaryChip
            label="Wastage"
            value={summary.totalWastage}
            tone="wastage"
          />
        </View>
      ) : null}

      <View style={styles.actionRow}>
        {MOVEMENT_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.key}
            style={[styles.actionBtn, {backgroundColor: action.bg}]}
            onPress={() => openMovementModal(action.key)}
            activeOpacity={0.85}>
            <Text style={[styles.actionBtnLabel, {color: action.color}]}>
              {action.label}
            </Text>
            <Text style={[styles.actionBtnHint, {color: action.color}]}>
              {action.hint}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.filtersCard}>
        <Text style={styles.filterTitle}>Period</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          {PERIOD_FILTERS.map(f => {
            const active = period === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setPeriod(f.key)}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterTitle, styles.filterTitleSpaced]}>
          Movement type
        </Text>
        <View style={styles.filterRow}>
          {MOVEMENT_FILTERS.map(f => {
            const active = movementFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setMovementFilter(f.key)}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.resultCount}>
          {movements.length} movement{movements.length === 1 ? '' : 's'}
          {summary ? ` · ${summary.movementCount} total in period` : ''}
        </Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Stock movements"
          subtitle={title}
          onBack={() => navigation.goBack()}
          right={
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => openMovementModal('IN')}
              hitSlop={8}
              activeOpacity={0.85}>
              <PlusIcon size={moderateScale(20)} color={colors.white} />
            </TouchableOpacity>
          }
        />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Could not load stock history</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <FlatList
            data={movements}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.listContent,
              isTablet() && {
                maxWidth: maxContentWidth(),
                width: '100%',
                alignSelf: 'center',
              },
            ]}
            ListHeaderComponent={listHeader}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => void refetch()}
                colors={[colors.green]}
                tintColor={colors.green}
              />
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No movements found</Text>
                <Text style={styles.emptyText}>
                  Adjust filters or add a stock movement.
                </Text>
              </Card>
            }
            renderItem={({item: movement}) => (
              <MovementRow movement={movement} unit={displayUnit} />
            )}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={movementModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeMovementModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeMovementModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalAvoid}>
            <Pressable
              style={styles.modalSheet}
              onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add stock movement</Text>
                <TouchableOpacity onPress={closeMovementModal} hitSlop={8}>
                  <CloseIcon size={moderateScale(22)} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {MOVEMENT_ACTIONS.map(action => {
                  const selected = movementType === action.key;
                  return (
                    <TouchableOpacity
                      key={action.key}
                      style={[
                        styles.typeChip,
                        selected && {
                          borderColor: action.color,
                          backgroundColor: action.bg,
                        },
                      ]}
                      onPress={() => setMovementType(action.key)}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.typeChipText,
                          selected && {color: action.color},
                        ]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Quantity ({displayUnit})</Text>
              <TextInput
                style={styles.fieldInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedLight}
              />

              <Text style={styles.fieldLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                placeholderTextColor={colors.mutedLight}
                multiline
              />

              <GradientButton
                title="Save movement"
                onPress={() => void onSubmitMovement()}
                loading={savingMovement}
                showArrow={false}
                style={styles.saveBtn}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'in' | 'out' | 'wastage';
}) {
  const toneStyle =
    tone === 'in'
      ? styles.summaryIn
      : tone === 'wastage'
        ? styles.summaryWastage
        : styles.summaryOut;

  return (
    <View style={[styles.summaryChip, toneStyle]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MovementRow({
  movement,
  unit,
}: {
  movement: InventoryMovement;
  unit: string;
}) {
  const style = movementStyle(movement.type);
  const remark =
    movement.remark_display?.trim() ||
    movement.note?.trim() ||
    (movement.is_order_related ? 'Order related' : '');

  return (
    <Card style={styles.movementCard}>
      <View style={styles.movementTop}>
        <View style={[styles.movementBadge, {backgroundColor: style.bg}]}>
          <Text style={[styles.movementBadgeText, {color: style.color}]}>
            {style.label}
          </Text>
        </View>
        <Text style={[styles.movementQty, {color: style.color}]}>
          {style.prefix}
          {movement.quantity} {unit}
        </Text>
      </View>
      <Text style={styles.movementBalance}>
        {movement.previous_quantity} → {movement.new_quantity} {unit}
      </Text>
      <View style={styles.movementMetaRow}>
        <Icon name="clock" size={moderateScale(14)} color={colors.muted} />
        <Text style={styles.movementMeta}>
          {formatMovementDate(movement.created_at)}
        </Text>
      </View>
      <Text style={styles.movementBy}>
        By {movement.updated_by_name || movement.created_by}
      </Text>
      {remark ? <Text style={styles.movementRemark}>{remark}</Text> : null}
      {movement.order_display ? (
        <Text style={styles.movementOrder}>Order: {movement.order_display}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F8FAF8'},
  safe: {flex: 1},
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  headerAddBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  listHeader: {gap: spacing.md, marginBottom: spacing.sm},
  heroCard: {padding: spacing.lg},
  heroTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
  },
  heroStock: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: colors.green,
  },
  heroMeta: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(13),
    color: colors.muted,
  },
  heroLinked: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(12),
    color: colors.mutedLight,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryChip: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  summaryIn: {backgroundColor: '#DCFCE7'},
  summaryOut: {backgroundColor: '#FEF3C7'},
  summaryWastage: {backgroundColor: '#FEE2E2'},
  summaryValue: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
  },
  summaryLabel: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: verticalScale(12),
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  actionBtnLabel: {
    fontSize: moderateScale(13),
    fontWeight: '800',
  },
  actionBtnHint: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(10),
    fontWeight: '600',
    opacity: 0.85,
  },
  filtersCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  filterTitle: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterTitleSpaced: {marginTop: spacing.sm},
  filterScroll: {gap: scale(8), paddingVertical: verticalScale(4)},
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  filterChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  filterChipText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.navy,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  resultCount: {
    marginTop: spacing.xs,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.muted,
  },
  movementCard: {padding: spacing.lg},
  movementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  movementBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: radii.pill,
  },
  movementBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  movementQty: {
    fontSize: moderateScale(18),
    fontWeight: '800',
  },
  movementBalance: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.navy,
  },
  movementMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(8),
  },
  movementMeta: {
    fontSize: moderateScale(12),
    color: colors.muted,
    fontWeight: '600',
  },
  movementBy: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    color: colors.muted,
  },
  movementRemark: {
    marginTop: verticalScale(6),
    fontSize: moderateScale(13),
    color: colors.navy,
    fontWeight: '500',
  },
  movementOrder: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.green,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: radii.lg,
    backgroundColor: colors.green,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: moderateScale(15),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalAvoid: {width: '100%'},
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeChipText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.muted,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(16),
    color: colors.navy,
    marginBottom: spacing.md,
  },
  fieldInputMultiline: {
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
  },
  saveBtn: {marginTop: spacing.sm},
});
