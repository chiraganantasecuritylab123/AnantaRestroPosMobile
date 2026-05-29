import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader, ScreenBackground } from '../components/ui';
import { cardShadow, colors, radii } from '../theme';
import {
  useGetPosInitQuery,
  Category,
  MenuItem,
  StoreTable,
} from '../services/posApi';
import { useAppDispatch, useAppSelector } from '../useAppHooks';
import {
  addItem,
  setItemNotes,
  setItemQuantity,
  setPaymentTypes,
  setTable,
} from '../features/cartSlice';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PosStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PosStackParamList, 'PosHome'>;
type Addon = { id: string; title: string; price: string };
type Variant = { id: string; title: string; price: string };
type RecipeItem = {
  id: string;
  variant_id: string | null;
  addon_id: string | null;
  ingredient_title?: string;
  unit?: string;
  recipe_quantity?: string;
};

const BG = colors.background;
const CHARCOAL = colors.navy;
const WARM = colors.navy;
const MUTED = colors.muted;
const ACCENT = colors.green;
const WHITE = colors.white;

type ChipLayout = { x: number; width: number };

function scrollChipIntoView(
  scrollRef: React.RefObject<ScrollView | null>,
  chip: ChipLayout | undefined,
) {
  if (!chip || !scrollRef.current) {
    return;
  }
  const screenW = Dimensions.get('window').width;
  const pad = 28;
  const chipRight = chip.x + chip.width;
  let scrollX = 0;
  if (chipRight > screenW - pad) {
    scrollX = chipRight - screenW + pad;
  }
  if (chip.x < scrollX + pad) {
    scrollX = Math.max(0, chip.x - pad);
  }
  scrollRef.current.scrollTo({ x: scrollX, animated: true });
}

export const PosHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { data, isLoading, isFetching, isError, refetch } = useGetPosInitQuery();
  const cart = useAppSelector(state => state.cart.items);
  const selectedTable = useAppSelector(state => state.cart.selectedTable);
  const dispatch = useAppDispatch();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempNotes, setTempNotes] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const categoryScrollRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, ChipLayout>>({});

  const registerChipLayout = useCallback((key: string, layout: ChipLayout) => {
    chipLayouts.current[key] = layout;
  }, []);

  const focusCategoryChip = useCallback(
    (key: string) => {
      requestAnimationFrame(() => {
        scrollChipIntoView(categoryScrollRef, chipLayouts.current[key]);
      });
    },
    [],
  );

  useEffect(() => {
    const paymentTypes = data?.paymentTypes ?? [];
    if (paymentTypes.length) {
      dispatch(setPaymentTypes(paymentTypes.filter(i => i.is_active)));
    }
    const storeTables = data?.storeTables ?? [];
    if (storeTables.length && !selectedTable) {
      dispatch(setTable(storeTables[0]));
    }
  }, [data, dispatch, selectedTable]);

  const enabledCategories: Category[] =
    data?.categories.filter(c => c.is_enabled) ?? [];

  const menuByCategory = useMemo(() => {
    const menuItems = data?.menuItems ?? [];
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter(m => {
      if (!m?.is_enabled) {
        return false;
      }
      if (selectedCategoryId && m.category_id !== selectedCategoryId) {
        return false;
      }
      if (q && !(m.title ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [data, selectedCategoryId, searchQuery]);

  const currency = data?.storeSettings.currency ?? '$';

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.net_price) * Number(item.quantity),
        0,
      ),
    [cart],
  );

  const cartItemCount = useMemo(
    () => cart.reduce((n, i) => n + Number(i.quantity), 0),
    [cart],
  );

  const openItem = (item: MenuItem) => {
    setSelectedItem(item);
    const existing = cart.find(c => c.id === item.id);
    setTempQty(existing?.quantity ?? 1);
    setTempNotes(existing?.notes ?? '');
    // Default: no variant selected, use base item price.
    setSelectedVariantId(null);
    setSelectedAddonIds([]);
  };

  const currentItemAddons = useMemo(
    () => ((selectedItem?.addons ?? []) as Addon[]),
    [selectedItem],
  );
  const currentItemVariants = useMemo(
    () => ((selectedItem?.variants ?? []) as Variant[]),
    [selectedItem],
  );
  const currentItemRecipe = useMemo(
    () => ((selectedItem?.recipeItems ?? []) as RecipeItem[]),
    [selectedItem],
  );

  const selectedVariant = useMemo(
    () => currentItemVariants.find(v => v.id === selectedVariantId) ?? null,
    [currentItemVariants, selectedVariantId],
  );

  const selectedAddons = useMemo(
    () => currentItemAddons.filter(a => selectedAddonIds.includes(a.id)),
    [currentItemAddons, selectedAddonIds],
  );

  const dynamicUnitPrice = useMemo(() => {
    if (!selectedItem) {
      return 0;
    }
    const base = selectedVariant
      ? Number(selectedVariant.price || 0)
      : Number(selectedItem.price || selectedItem.net_price || 0);
    const addonTotal = selectedAddons.reduce((s, a) => s + Number(a.price || 0), 0);
    return base + addonTotal;
  }, [selectedItem, selectedVariant, selectedAddons]);

  const recipePreview = useMemo(() => {
    return currentItemRecipe.filter(r => {
      const variantOk = !r.variant_id || r.variant_id === selectedVariantId;
      const addonOk = !r.addon_id || selectedAddonIds.includes(r.addon_id);
      return variantOk && addonOk;
    });
  }, [currentItemRecipe, selectedVariantId, selectedAddonIds]);

  const applyItem = () => {
    if (!selectedItem) {
      return;
    }
    const selectedOptionSummary = [
      selectedVariant ? `Variant: ${selectedVariant.title}` : null,
      selectedAddons.length
        ? `Addons: ${selectedAddons.map(a => a.title).join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const mergedNotes = [tempNotes, selectedOptionSummary].filter(Boolean).join('\n');

    const configuredItem: MenuItem = {
      ...selectedItem,
      addons: selectedAddons,
      variants: selectedVariant ? [selectedVariant] : [],
      recipeItems: recipePreview,
      net_price: String(dynamicUnitPrice),
      price: String(dynamicUnitPrice),
    };

    dispatch(addItem(configuredItem));
    dispatch(setItemQuantity({ id: selectedItem.id, quantity: tempQty }));
    dispatch(setItemNotes({ id: selectedItem.id, notes: mergedNotes }));
    setSelectedItem(null);
  };

  const pickTable = (t: StoreTable) => {
    dispatch(setTable(t));
    setTableMenuOpen(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Preparing your menu…</Text>
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <Text style={styles.error}>Unable to load menu.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setTableMenuOpen(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Open table menu">
              <Text style={styles.iconBtnText}>☰</Text>
            </TouchableOpacity>
            <BrandHeader compact style={styles.brandCenter} />
            <TouchableOpacity
              style={styles.iconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="More">
              <Text style={styles.bellEmoji}>⋮</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search product by name"
              placeholderTextColor={colors.mutedLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Text style={styles.searchIcon}>⌕</Text>
          </View>

          <TouchableOpacity
            style={styles.tableSelectRow}
            onPress={() => setTableMenuOpen(true)}
            activeOpacity={0.85}>
            <Text style={styles.tableSelectLabel}>Table</Text>
            <Text style={styles.tableSelectValue} numberOfLines={1}>
              {selectedTable?.table_title ?? 'Select table'} ›
            </Text>
          </TouchableOpacity>

          <View style={{ height: 44, marginVertical: 12 }}>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              height: '100%',
              alignItems: 'center',
              paddingHorizontal: 10,
              gap: 10,
            }}
          >
            <View
              onLayout={e => {
                const { x, width } = e.nativeEvent.layout;
                registerChipLayout('all', { x, width });
              }}>
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategoryId === null && styles.categoryPillActive,
                ]}
                onPress={() => {
                  setSelectedCategoryId(null);
                  focusCategoryChip('all');
                }}>
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategoryId === null && styles.categoryPillTextActive,
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
            </View>
            {enabledCategories.map(cat => (
              <View
                key={cat.id}
                onLayout={e => {
                  const { x, width } = e.nativeEvent.layout;
                  registerChipLayout(String(cat.id), { x, width });
                }}>
                <TouchableOpacity
                  style={[
                    styles.categoryPill,
                    selectedCategoryId === cat.id && styles.categoryPillActive,
                  ]}
                  onPress={() => {
                    const next =
                      selectedCategoryId === cat.id ? null : cat.id;
                    setSelectedCategoryId(next);
                    focusCategoryChip(
                      next === null ? 'all' : String(cat.id),
                    );
                  }}>
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategoryId === cat.id && styles.categoryPillTextActive,
                    ]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={menuByCategory}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyMenu}>
              <Text style={styles.emptyMenuTitle}>No dishes here</Text>
              <Text style={styles.emptyMenuText}>
                Try another category or ask the kitchen to enable items.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, cardShadow]}
              activeOpacity={0.92}
              onPress={() => openItem(item)}>
              <View style={styles.cardImageWrap}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={styles.placeholderGlyph}>🍽</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.allergyRow}>
                  <Text style={styles.allergyIcon}>ⓘ</Text>
                  <Text style={styles.allergyText} numberOfLines={1}>
                    Allergies: check with kitchen · {item.category_title}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>
                    {currency} {item.net_price}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.plusFab}
                onPress={() => openItem(item)}>
                <Text style={styles.plusFabText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[
            styles.scanFab,
            {bottom: cart.length > 0 ? 100 : 24},
          ]}
          activeOpacity={0.9}
          onPress={() =>
            Alert.alert('Scan', 'Barcode scanning will be available soon.')
          }>
          <Text style={styles.scanFabText}>⌁ SCAN</Text>
        </TouchableOpacity>

        {cart.length > 0 && (
          <View style={[styles.cartBar, cardShadow]}>
            <View style={styles.cartBarLeft}>
              <Text style={styles.cartBarCount}>
                {cart.length} Items · Qty {cartItemCount}
              </Text>
              <Text style={styles.cartBarTotalLabel}>Total</Text>
              <Text style={styles.cartBarTotal}>
                {currency} {total.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cartBarCta}
              onPress={() => navigation.navigate('PosCheckout')}
              activeOpacity={0.9}>
              <Text style={styles.cartBarCtaText}>Checkout →</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={tableMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setTableMenuOpen(false)}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setTableMenuOpen(false)}>
            <View style={styles.tableSheet}>
              <Text style={styles.tableSheetTitle}>Switch table</Text>
              {(data?.storeTables ?? []).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.tableRow,
                    selectedTable?.id === t.id && styles.tableRowActive,
                  ]}
                  onPress={() => pickTable(t)}>
                  <Text style={styles.tableRowTitle}>{t.table_title}</Text>
                  <Text style={styles.tableRowSub}>
                    {t.floor} · seats {t.seating_capacity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={!!selectedItem} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setSelectedItem(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHero}>
                {selectedItem?.image ? (
                  <Image
                    source={{ uri: selectedItem.image }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View style={[styles.modalImage, styles.modalImagePh]}>
                    <Text style={styles.modalPhGlyph}>🍽</Text>
                  </View>
                )}
                <View style={styles.modalHeroBar}>
                  <TouchableOpacity onPress={() => setSelectedItem(null)}>
                    <Text style={styles.modalBack}>←</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.modalMore}>•••</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.modalSheet}>
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalTitle}>{selectedItem?.title}</Text>
                  <View style={styles.qtyPill}>
                    <TouchableOpacity
                      style={styles.qtyCircle}
                      onPress={() => setTempQty(q => Math.max(1, q - 1))}>
                      <Text style={styles.qtyCircleText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{tempQty}</Text>
                    <TouchableOpacity
                      style={[styles.qtyCircle, styles.qtyCirclePlus]}
                      onPress={() => setTempQty(q => q + 1)}>
                      <Text style={styles.qtyCircleText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.modalPrice}>
                  {currency} {dynamicUnitPrice.toFixed(2)}
                  {/* {currency} {(tempQty * dynamicUnitPrice).toFixed(2)} */}
                </Text>
                {currentItemVariants.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Select variant</Text>
                    <View style={styles.choiceRow}>
                      {currentItemVariants.map(variant => {
                        const active = selectedVariantId === variant.id;
                        return (
                          <TouchableOpacity
                            key={variant.id}
                            style={[styles.choiceChip, active && styles.choiceChipActive]}
                            onPress={() => {
                              if (active) {
                                setSelectedVariantId(null);
                              } else {
                                setSelectedVariantId(variant.id);
                              }
                            }}>
                            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                              {variant.title} ({currency} {variant.price})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                {currentItemAddons.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Add-ons</Text>
                    <View style={styles.choiceRow}>
                      {currentItemAddons.map(addon => {
                        const active = selectedAddonIds.includes(addon.id);
                        return (
                          <TouchableOpacity
                            key={addon.id}
                            style={[styles.choiceChip, active && styles.choiceChipActive]}
                            onPress={() =>
                              setSelectedAddonIds(prev =>
                                prev.includes(addon.id)
                                  ? prev.filter(id => id !== addon.id)
                                  : [...prev, addon.id],
                              )
                            }>
                            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                              {addon.title} (+{currency} {addon.price})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                {recipePreview.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Recipe preview</Text>
                    {recipePreview.slice(0, 3).map(ri => (
                      <Text key={ri.id} style={styles.recipeLine}>
                        - {ri.ingredient_title ?? 'Ingredient'} {ri.recipe_quantity ?? ''}{' '}
                        {ri.unit ?? ''}
                      </Text>
                    ))}
                  </>
                )}
                {!!selectedItem?.description && (
                  <Text style={styles.modalDesc}>{selectedItem.description}</Text>
                )}
                <View style={styles.modalAllergy}>
                  <Text style={styles.modalAllergyIcon}>ⓘ</Text>
                  <Text style={styles.modalAllergyText}>
                    Allergies: verify with kitchen · {selectedItem?.category_title}
                  </Text>
                </View>
                <TextInput
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  style={styles.notesInput}
                  placeholder="Special requests / notes"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                />
                <TouchableOpacity
                  style={styles.addToCartCta}
                  onPress={applyItem}
                  activeOpacity={0.9}>
                  <Text style={styles.addToCartText}>Add to cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: WHITE,
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
    ...cardShadow,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: MUTED,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 8,
  },
  brandCenter: { flex: 1, justifyContent: 'center' },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 15,
    color: WARM,
  },
  searchIcon: {
    position: 'absolute',
    right: 14,
    top: 13,
    fontSize: 18,
    color: MUTED,
  },
  tableSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 8,
  },
  tableSelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  tableSelectValue: {
    fontSize: 14,
    fontWeight: '700',
    color: WARM,
    maxWidth: '70%',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  iconBtnText: {
    fontSize: 18,
    color: WARM,
    fontWeight: '700',
  },
  bellEmoji: { fontSize: 20 },
  tablePill: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  tablePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tablePillTitle: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: '800',
    color: WARM,
  },
  heroKicker: {
    marginLeft: 20,
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  heroTitle: {
    marginTop: 6,
    marginHorizontal: 20,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: WARM,
    letterSpacing: -0.3,
  },
  /** No maxHeight — fixed height was clipping pill text (esp. Android font padding). */
  categoryScrollWrap: { marginTop: 18 },
  categoryScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
    alignItems: 'center',
    paddingRight: 40,
  },
  /** Single style for "All" + category chips so selected state matches everywhere. */
  categoryPill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  categoryPillActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  categoryPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
    lineHeight: 20,
  },
  categoryPillTextActive: { color: WHITE },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  gridRow: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 22,
    overflow: 'visible',
    marginTop: 4,
  },
  cardImageWrap: {
    backgroundColor: CHARCOAL,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    height: 112,
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHARCOAL,
  },
  placeholderGlyph: { fontSize: 36, opacity: 0.35 },
  cardBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WARM,
    minHeight: 40,
  },
  allergyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  allergyIcon: { fontSize: 12, color: MUTED },
  allergyText: { flex: 1, fontSize: 11, color: MUTED, lineHeight: 14 },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: { fontSize: 16, fontWeight: '800', color: WARM },
  plusFab: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 33,
    height: 33,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  plusFabText: { color: WHITE, fontSize: 24, fontWeight: '600', marginTop: -2 },
  scanFab: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  scanFabText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 13,
  },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: WHITE,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cartBarLeft: { flex: 1 },
  cartBarCount: { color: MUTED, fontSize: 12, fontWeight: '600' },
  cartBarTotalLabel: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  cartBarTotal: { color: WARM, fontSize: 20, fontWeight: '800' },
  cartBarCta: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cartBarCtaText: {
    color: WHITE,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyMenu: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyMenuTitle: { fontSize: 18, fontWeight: '700', color: WARM },
  emptyMenuText: { marginTop: 8, textAlign: 'center', color: MUTED, lineHeight: 22 },
  error: { color: '#b00020', marginBottom: 12 },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: ACCENT,
    borderRadius: 22,
  },
  retryText: { color: WHITE, fontWeight: '700' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  tableSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  tableSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WARM,
    marginBottom: 12,
  },
  tableRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8DFD2',
  },
  tableRowActive: { backgroundColor: 'rgba(255,159,90,0.12)', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 12 },
  tableRowTitle: { fontSize: 16, fontWeight: '700', color: WARM },
  tableRowSub: { marginTop: 4, fontSize: 13, color: MUTED },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  modalCard: {
    backgroundColor: CHARCOAL,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  modalHero: { height: 220, backgroundColor: '#2a2a2a' },
  modalImage: { width: '100%', height: '100%' },
  modalImagePh: { alignItems: 'center', justifyContent: 'center' },
  modalPhGlyph: { fontSize: 56, opacity: 0.25 },
  modalHeroBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBack: {
    fontSize: 22,
    color: WHITE,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalMore: {
    fontSize: 18,
    color: WHITE,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalSheet: { padding: 20, paddingBottom: 28 },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    color: WHITE,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  qtyCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCirclePlus: { backgroundColor: ACCENT },
  qtyCircleText: { fontSize: 20, fontWeight: '700', color: WARM, marginTop: -1 },
  qtyValue: { color: WHITE, fontSize: 17, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  modalPrice: { marginTop: 10, color: WHITE, fontSize: 22, fontWeight: '800' },
  modalDesc: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 21,
  },
  modalSectionTitle: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(255,159,90,0.25)',
    borderColor: ACCENT,
  },
  choiceText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: WHITE,
    fontWeight: '700',
  },
  recipeLine: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  modalAllergy: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  modalAllergyIcon: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  modalAllergyText: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
  },
  notesInput: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: WHITE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addToCartCta: {
    marginTop: 18,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  addToCartText: { color: WHITE, fontWeight: '800', fontSize: 17 },
});
