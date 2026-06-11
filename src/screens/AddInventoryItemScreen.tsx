import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  resolveAllLinkableMenuItems,
  useAddInventoryItemMutation,
  useGetLinkableMenuItemsQuery,
  type LinkableMenuItem,
} from '../services/inventoryApi';
import { useGetPosInitQuery } from '../services/posApi';
import type { ProfileStackParamList } from '../navigation/types';
import { Card, ChevronRightIcon, CloseIcon, GradientButton, TopHeader } from '../components/ui';
import { showDialog } from '../context/DialogProvider';
import { cardShadow, colors, radii, spacing } from '../theme';
import {
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddInventoryItem'>;

const UNIT_OPTIONS = ['pc', 'kg', 'g', 'l', 'ml', 'box', 'pack'];

export const AddInventoryItemScreen: React.FC<Props> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pc');
  const [minThreshold, setMinThreshold] = useState('');

  const {
    data: linkableData,
    isLoading: loadingMenuItems,
    isFetching: fetchingMenuItems,
    isError: menuItemsError,
    refetch: refetchMenuItems,
  } = useGetLinkableMenuItemsQuery();
  const { data: posInit } = useGetPosInitQuery();
  const [addItem, { isLoading }] = useAddInventoryItemMutation();

  useEffect(() => {
    if (pickerOpen) {
      void refetchMenuItems();
    }
  }, [pickerOpen, refetchMenuItems]);

  const menuItems = useMemo(
    () => resolveAllLinkableMenuItems(linkableData?.items, posInit?.menuItems),
    [linkableData?.items, posInit?.menuItems],
  );

  const selectedMenuItem = useMemo(
    () => menuItems.find(item => item.id === selectedMenuItemId) ?? null,
    [menuItems, selectedMenuItemId],
  );

  const titleFromMenu = Boolean(selectedMenuItemId);
  const titleFromManual = Boolean(title.trim()) && !selectedMenuItemId;
  const menuPickerDisabled = titleFromManual;
  const titleFieldDisabled = titleFromMenu;

  const effectiveTitle = selectedMenuItem?.title ?? title.trim();

  const canSave =
    Boolean(effectiveTitle) &&
    Boolean(quantity.trim()) &&
    Boolean(minThreshold.trim()) &&
    Boolean(unit.trim());

  const resetForm = () => {
    setTitle('');
    setSelectedMenuItemId(null);
    setQuantity('');
    setMinThreshold('');
    setUnit('pc');
  };

  const onSelectMenuItem = (item: LinkableMenuItem) => {
    setSelectedMenuItemId(item.id);
    setTitle(item.title);
    setPickerOpen(false);
  };

  const onClearMenuItem = () => {
    setSelectedMenuItemId(null);
    setTitle('');
  };

  const onUnselectMenuItem = () => {
    onClearMenuItem();
    setPickerOpen(false);
  };

  const onTitleChange = (value: string) => {
    if (selectedMenuItemId) {
      return;
    }
    setTitle(value);
  };

  const onSubmit = async () => {
    if (!effectiveTitle) {
      showDialog('Inventory', 'Select a menu item or enter item name.');
      return;
    }
    const qty = Number(quantity);
    const minQty = Number(minThreshold);
    if (!Number.isFinite(qty) || qty < 0) {
      showDialog('Inventory', 'Enter a valid quantity.');
      return;
    }
    if (!Number.isFinite(minQty) || minQty < 0) {
      showDialog('Inventory', 'Enter a valid minimum threshold.');
      return;
    }
    if (!unit.trim()) {
      showDialog('Inventory', 'Select a unit.');
      return;
    }

    try {
      const res = await addItem({
        title: effectiveTitle,
        quantity: qty,
        unit: unit.trim(),
        min_quantity_threshold: minQty,
        ...(selectedMenuItemId
          ? { linkedMenuItemIds: [selectedMenuItemId] }
          : {}),
      }).unwrap();

      showDialog('Success', res.message ?? 'Inventory item added.', [
        {
          text: 'Add another',
          onPress: resetForm,
        },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      showDialog(
        'Could not add item',
        err?.data?.message ?? 'Please try again.',
      );
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TopHeader
            title="Add inventory"
            subtitle="Link menu item or enter custom name"
            onBack={() => navigation.goBack()}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <SectionCard
              step="1"
              title="Item source"
              hint="Pick a menu item or type a custom stock name">
              <Text style={styles.fieldLabel}>Link menu item</Text>
              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  menuPickerDisabled && styles.selectBtnDisabled,
                ]}
                onPress={() => {
                  if (!menuPickerDisabled) {
                    setPickerOpen(true);
                  }
                }}
                disabled={menuPickerDisabled}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.selectBtnText,
                    !selectedMenuItem && styles.selectBtnPlaceholder,
                    menuPickerDisabled && styles.selectBtnTextDisabled,
                  ]}
                  numberOfLines={1}>
                  {selectedMenuItem?.title ?? 'Select menu item (optional)'}
                </Text>
                <ChevronRightIcon
                  size={moderateScale(18)}
                  color={menuPickerDisabled ? colors.mutedLight : colors.muted}
                />
              </TouchableOpacity>
              {selectedMenuItem ? (
                <TouchableOpacity
                  style={styles.clearLinkBtn}
                  onPress={onClearMenuItem}>
                  <Text style={styles.clearLinkText}>Clear menu link</Text>
                </TouchableOpacity>
              ) : null}
              {menuPickerDisabled ? (
                <Text style={styles.helperText}>
                  Custom name entered — menu link is disabled.
                </Text>
              ) : null}

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <Field
                label="Custom item name"
                value={titleFromMenu ? selectedMenuItem?.title ?? '' : title}
                onChangeText={onTitleChange}
                placeholder="Rice, Cooking oil…"
                editable={!titleFieldDisabled}
              />
              {titleFieldDisabled ? (
                <Text style={styles.helperText}>
                  Name comes from the selected menu item.
                </Text>
              ) : null}
            </SectionCard>

            <SectionCard
              step="2"
              title="Stock levels"
              hint="Current qty and low-stock alert">
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Field
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="25"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Field
                    label="Min threshold"
                    value={minThreshold}
                    onChangeText={setMinThreshold}
                    placeholder="10"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.chipGrid}>
                {UNIT_OPTIONS.map(u => {
                  const active = unit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setUnit(u)}
                      activeOpacity={0.85}>
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {unit ? (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>✓ Unit: {unit}</Text>
                </View>
              ) : null}
            </SectionCard>

            <Card style={styles.tipCard}>
              <Text style={styles.tipTitle}>Menu link</Text>
              <Text style={styles.tipText}>
                Linking a menu item enables automatic stock tracking when that
                dish is sold. Use a custom name for raw materials without a menu
                item.
              </Text>
            </Card>
            <View style={styles.footer}>
              <GradientButton
                title={isLoading ? 'Saving…' : 'Save inventory item'}
                onPress={onSubmit}
                loading={isLoading}
                disabled={isLoading || !canSave}
                showArrow={false}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link menu item</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPickerOpen(false)}
                hitSlop={scale(8)}>
                <CloseIcon size={moderateScale(22)} color={colors.navy} />
              </TouchableOpacity>
            </View>

            {loadingMenuItems || fetchingMenuItems ? (
              <ActivityIndicator
                color={colors.green}
                style={styles.modalLoader}
              />
            ) : menuItemsError && menuItems.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>
                  Could not load menu items.
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => refetchMenuItems()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : menuItems.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>
                  No menu items available.
                </Text>
              </View>
            ) : (
              <FlatList
                data={menuItems}
                keyExtractor={item => item.id}
                style={styles.modalList}
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[
                      styles.menuRow,
                      styles.menuRowUnselect,
                      !selectedMenuItemId && styles.menuRowActive,
                    ]}
                    onPress={onUnselectMenuItem}
                    activeOpacity={0.85}>
                    <Text
                      style={[
                        styles.menuRowText,
                        !selectedMenuItemId && styles.menuRowTextActive,
                      ]}>
                      None — no menu link
                    </Text>
                    {!selectedMenuItemId ? (
                      <Text style={styles.menuRowCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                }
                renderItem={({ item }) => {
                  const active = item.id === selectedMenuItemId;
                  const isLinked = Boolean(item.linked_inventory_item_id);
                  return (
                    <TouchableOpacity
                      style={[styles.menuRow, active && styles.menuRowActive]}
                      onPress={() => onSelectMenuItem(item)}
                      activeOpacity={0.85}>
                      <View style={styles.menuRowBody}>
                        <Text
                          style={[
                            styles.menuRowText,
                            active && styles.menuRowTextActive,
                          ]}>
                          {item.title}
                        </Text>
                        {isLinked ? (
                          <Text style={styles.menuRowMeta}>Already linked</Text>
                        ) : null}
                      </View>
                      {active ? (
                        <Text style={styles.menuRowCheck}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

function SectionCard({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <View style={styles.sectionTitles}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  flex: { flex: 1 },
  safe: { flex: 1 },
  scrollView: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: maxContentWidth(),
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.borderLight,
  },
  stepBadge: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.white,
  },
  sectionTitles: { flex: 1, flexShrink: 1 },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  sectionHint: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(17),
    flexShrink: 1,
  },
  sectionBody: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: colors.navy,
  },
  inputDisabled: {
    backgroundColor: colors.borderLight,
    color: colors.muted,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    marginBottom: spacing.sm,
  },
  selectBtnDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.7,
  },
  selectBtnText: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: colors.navy,
    flexShrink: 1,
  },
  selectBtnPlaceholder: {
    color: colors.mutedLight,
    fontWeight: '500',
  },
  selectBtnTextDisabled: {
    color: colors.muted,
  },
  clearLinkBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  clearLinkText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.green,
  },
  helperText: {
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(17),
    marginBottom: spacing.sm,
    flexShrink: 1,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  rowFields: {
    flexDirection: 'row',
    gap: scale(12),
  },
  halfField: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  chipText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.navy,
    flexShrink: 1,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  selectedPill: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: radii.pill,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedPillText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.greenDark,
    flexShrink: 1,
  },
  tipCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipTitle: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: '#B45309',
    flexShrink: 1,
  },
  tipText: {
    marginTop: spacing.sm,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    color: colors.muted,
    flexShrink: 1,
  },
  footer: {
    marginVertical: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  modalCloseBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalLoader: {
    marginVertical: spacing.xl,
  },
  modalList: {
    maxHeight: verticalScale(360),
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  modalEmptyText: {
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
    flexShrink: 1,
  },
  retryBtn: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  menuRowUnselect: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  menuRowBody: {
    flex: 1,
    flexShrink: 1,
  },
  menuRowMeta: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: colors.muted,
    flexShrink: 1,
  },
  menuRowActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: radii.md,
  },
  menuRowText: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: colors.navy,
    flexShrink: 1,
  },
  menuRowTextActive: {
    color: colors.greenDark,
    fontWeight: '700',
  },
  menuRowCheck: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.green,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
});
