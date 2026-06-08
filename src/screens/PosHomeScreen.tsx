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
  Pressable,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ChevronLeftIcon,
  ClipboardIcon,
  DraftIcon,
  GridIcon,
  InfoIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TopHeader,
  UserIcon,
  CloseIcon,
  CheckIcon,
  PrinterIcon,
  UtensilsIcon,
} from '../components/ui';
import { cardShadow, colors, radii, spacing } from '../theme';
import {
  useGetPosInitQuery,
  Category,
  MenuItem,
  type PaymentType,
  type PosInitResponse,
} from '../services/posApi';
import { useAppDispatch, useAppSelector } from '../useAppHooks';
import { usePosOrderDraftHydration } from '../hooks/usePosOrderDraftHydration';
import {
  addPosOrderDraft,
  draftOrderMeta,
  loadPosOrderDrafts,
  removePosOrderDraft,
  type PosOrderDraft,
} from '../storage/posOrderDraftStorage';
import {
  addItem,
  clearCart,
  restoreCartDraft,
  setBillMode,
  setDeliveryType,
  setItemNotes,
  setItemQuantity,
  setPaymentType,
  setPaymentTypes,
  setSelectedCustomer,
  setTable,
} from '../features/cartSlice';
import { CustomerPickerModal } from '../components/pos/CustomerPickerModal';
import { ServiceTypeSelector } from '../components/pos/ServiceTypeSelector';
import {
  useCreateOrderAndInvoiceMutation,
  useCreateOrderMutation,
} from '../services/orderApi';
import {
  formatPrintSkippedMessage,
  printOnOrderPlaced,
  wasReceiptPrinted,
} from '../services/orderPlacementPrint';
import { getReceiptPrintSkipReason } from '../utils/printConfig';
import { addOrderHistoryItem } from '../features/orderHistorySlice';
import {
  buildCartLineKey,
  buildCreateOrderAndInvoiceRequest,
  buildCreateOrderRequest,
  computeCartAmount,
  findCashPaymentType,
  formatTokenLabel,
  itemNeedsConfiguration,
  parseOrderId,
  parseTokenNo,
  resolveServiceChargeRate,
} from '../utils/posOrder';
import { resolveCurrencySymbol } from '../utils/currency';
import { playOrderSuccessSound } from '../utils/playOrderSuccessSound';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, PosStackParamList } from '../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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

const BG = colors.white;
const CHARCOAL = colors.navy;
const WARM = colors.navy;
const MUTED = colors.muted;
/** Primary action color driven by remote config branding. */
const ACCENT = colors.green;
const WHITE = colors.white;
const PRICE_HIGHLIGHT = colors.orange;
const MENU_BG = colors.background;

function paymentTypeGlyph(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('cash')) {
    return '💵';
  }
  if (t.includes('upi') || t.includes('paytm') || t.includes('phonepe')) {
    return '📱';
  }
  if (t.includes('card') || t.includes('credit') || t.includes('debit')) {
    return '💳';
  }
  return '💰';
}

function isPaymentIconUrl(icon?: string | null): boolean {
  const value = icon?.trim() ?? '';
  return /^https?:\/\//i.test(value);
}

function PaymentTypeIcon({
  title,
  icon,
  size = 22,
}: {
  title: string;
  icon?: string | null;
  size?: number;
}) {
  if (isPaymentIconUrl(icon)) {
    return (
      <Image
        source={{ uri: icon!.trim() }}
        style={{ width: size, height: size, borderRadius: 4 }}
        resizeMode="contain"
        accessibilityLabel={title}
      />
    );
  }
  return (
    <Text style={{ fontSize: size * 0.9, lineHeight: size + 2 }}>
      {paymentTypeGlyph(title)}
    </Text>
  );
}

function withOpacity(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type MenuViewMode = 'grid' | 'list';

function getMenuItemDiscountPercent(item: MenuItem): number | null {
  const listPrice = Number(item.price || 0);
  const net = Number(item.net_price || 0);
  if (listPrice > net && listPrice > 0) {
    return Math.round(((listPrice - net) / listPrice) * 100);
  }
  return null;
}

function menuItemHasListPrice(item: MenuItem): boolean {
  const listPrice = Number(item.price || 0);
  const net = Number(item.net_price || 0);
  return listPrice > net && listPrice > 0;
}

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
  usePosOrderDraftHydration();
  const insets = useSafeAreaInsets();
  const tabNavigation =
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();

  const goBack = useCallback(() => {
    if (tabNavigation?.canGoBack()) {
      tabNavigation.goBack();
      return;
    }
    tabNavigation?.navigate('Dashboard', { screen: 'DashboardMain' });
  }, [tabNavigation]);

  const { data, isLoading, isFetching, isError, refetch } = useGetPosInitQuery();
  const cart = useAppSelector(state => state.cart.items);
  const cartState = useAppSelector(state => state.cart);
  const outletId = useAppSelector(state => state.authToken.outletId);
  const dispatch = useAppDispatch();
  const [createOrder, { isLoading: creatingOrder }] = useCreateOrderMutation();
  const [createOrderAndInvoice, { isLoading: creatingInvoice }] =
    useCreateOrderAndInvoiceMutation();
  const [successModal, setSuccessModal] = useState<{
    formattedToken: string;
    tokenNo: number;
    orderId: string | number | undefined;
    invoiceId?: string | number | undefined;
    total: number;
    totalItems: number;
    printed: boolean;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempNotes, setTempNotes] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [cartSummaryVisible, setCartSummaryVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [draftModalVisible, setDraftModalVisible] = useState(false);
  const [storedDrafts, setStoredDrafts] = useState<PosOrderDraft[]>([]);
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);
  const [draftModalLoading, setDraftModalLoading] = useState(false);
  const [menuViewMode, setMenuViewMode] = useState<MenuViewMode>('grid');
  const categoryScrollRef = useRef<ScrollView>(null);
  const modalSearchInputRef = useRef<TextInput>(null);
  const chipLayouts = useRef<Record<string, ChipLayout>>({});
  const initDefaultsRef = useRef(false);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedItem(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedItem]);

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
    if (!data) {
      return;
    }
    const activePaymentTypes = (data.paymentTypes ?? []).filter(pt => pt?.is_active);
    if (activePaymentTypes.length) {
      dispatch(setPaymentTypes(activePaymentTypes));
    }
    if (!initDefaultsRef.current) {
      if (cart.length === 0) {
        dispatch(setDeliveryType('takeaway'));
        dispatch(setBillMode('order'));
        dispatch(setTable(null));
      }
      initDefaultsRef.current = true;
    }
  }, [data, dispatch, cart.length]);

  const serviceChargeRate = useMemo(
    () => resolveServiceChargeRate(cartState.deliveryType, data?.serviceCharge),
    [cartState.deliveryType, data?.serviceCharge],
  );
  const amount = useMemo(
    () => computeCartAmount(cart, serviceChargeRate),
    [cart, serviceChargeRate],
  );
  const isSubmitting = creatingOrder || creatingInvoice;
  const paymentTypes = cartState.paymentTypes;
  const cashPayment = useMemo(
    () => findCashPaymentType(paymentTypes),
    [paymentTypes],
  );
  const selectedPaymentId =
    cartState.selectedPaymentType ?? cashPayment?.id ?? null;
  const selectedPayment = useMemo(
    () =>
      paymentTypes.find(pt => String(pt.id) === String(selectedPaymentId)) ??
      null,
    [paymentTypes, selectedPaymentId],
  );

  const renderCartPaymentTypes = (types: PaymentType[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.cartPaymentScroll}
      keyboardShouldPersistTaps="handled">
      {types.map(pt => {
        const selected = String(selectedPaymentId) === String(pt.id);
        return (
          <TouchableOpacity
            key={pt.id}
            style={[
              styles.cartPaymentChip,
              selected && styles.cartPaymentChipActive,
            ]}
            onPress={() => dispatch(setPaymentType(pt.id))}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={pt.title}>
            <PaymentTypeIcon title={pt.title} icon={pt.icon} size={20} />
            <Text
              style={[
                styles.cartPaymentChipLabel,
                selected && styles.cartPaymentChipLabelActive,
              ]}
              numberOfLines={1}>
              {pt.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const enabledCategories: Category[] =
    data?.categories.filter(c => c.is_enabled) ?? [];

  const menuByCategory = useMemo(() => {
    const menuItems = data?.menuItems ?? [];
    return menuItems.filter(m => {
      if (!m?.is_enabled) {
        return false;
      }
      if (selectedCategoryId && m.category_id !== selectedCategoryId) {
        return false;
      }
      return true;
    });
  }, [data, selectedCategoryId]);

  const searchResults = useMemo(() => {
    const menuItems = data?.menuItems ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return menuItems.filter(m => {
      if (!m?.is_enabled) {
        return false;
      }
      const title = (m.title ?? '').toLowerCase();
      const category = (m.category_title ?? '').toLowerCase();
      return title.includes(q) || category.includes(q);
    });
  }, [data?.menuItems, searchQuery]);

  const openSearchModal = useCallback(() => {
    setSearchModalVisible(true);
    requestAnimationFrame(() => {
      setTimeout(() => modalSearchInputRef.current?.focus(), 80);
    });
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalVisible(false);
    setSearchQuery('');
  }, []);

  const closeMoreMenu = useCallback(() => setMoreMenuVisible(false), []);

  const onMoreCartCheckout = useCallback(() => {
    closeMoreMenu();
    navigation.navigate('PosCheckout');
  }, [closeMoreMenu, navigation]);

  const onMoreOrders = useCallback(() => {
    closeMoreMenu();
    tabNavigation?.navigate('Orders');
  }, [closeMoreMenu, tabNavigation]);

  const onMoreToggleView = useCallback(() => {
    setMenuViewMode(prev => (prev === 'grid' ? 'list' : 'grid'));
    closeMoreMenu();
  }, [closeMoreMenu]);

  const onMoreCustomer = useCallback(() => {
    closeMoreMenu();
    setCustomerModalVisible(true);
  }, [closeMoreMenu]);

  const openCartSummary = useCallback(() => {
    setCartSummaryVisible(true);
  }, []);

  const currency = resolveCurrencySymbol(data?.storeSettings?.currency);
  const storeTitle =
    data?.storeSettings?.store_name?.trim() || 'Point of sale';

  const refreshStoredDrafts = useCallback(async () => {
    const drafts = await loadPosOrderDrafts(outletId);
    setStoredDrafts(drafts);
    return drafts;
  }, [outletId]);

  useEffect(() => {
    void refreshStoredDrafts();
  }, [refreshStoredDrafts]);

  const viewingDraft = useMemo(
    () => storedDrafts.find(d => d.id === viewingDraftId) ?? null,
    [storedDrafts, viewingDraftId],
  );

  const viewingDraftAmount = useMemo(() => {
    if (!viewingDraft?.items.length) {
      return null;
    }
    const rate = resolveServiceChargeRate(
      viewingDraft.deliveryType,
      data?.serviceCharge,
    );
    return computeCartAmount(viewingDraft.items, rate);
  }, [viewingDraft, data?.serviceCharge]);

  const openDraftModal = useCallback(async () => {
    setViewingDraftId(null);
    setDraftModalVisible(true);
    setDraftModalLoading(true);
    await refreshStoredDrafts();
    setDraftModalLoading(false);
  }, [refreshStoredDrafts]);

  const closeDraftModal = useCallback(() => {
    setDraftModalVisible(false);
    setViewingDraftId(null);
  }, []);

  const applyStoredDraft = useCallback(
    (draft: PosOrderDraft) => {
      dispatch(
        restoreCartDraft({
          items: draft.items,
          deliveryType: draft.deliveryType,
          billMode: draft.billMode,
          tableId: draft.tableId,
          selectedPaymentType: draft.selectedPaymentType,
          selectedCustomer: draft.selectedCustomer,
          selectedTable: draft.selectedTable,
        }),
      );
      closeDraftModal();
    },
    [closeDraftModal, dispatch],
  );

  const onRestoreDraft = useCallback(
    (draft: PosOrderDraft) => {
      if (cart.length > 0) {
        Alert.alert(
          'Replace cart?',
          'Your current cart will be replaced with this saved order.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore',
              onPress: () => applyStoredDraft(draft),
            },
          ],
        );
        return;
      }
      applyStoredDraft(draft);
    },
    [applyStoredDraft, cart.length],
  );

  const onDeleteDraft = useCallback(
    (draft: PosOrderDraft) => {
      Alert.alert(
        'Delete saved order?',
        'This draft will be removed from this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await removePosOrderDraft(outletId, draft.id);
              if (viewingDraftId === draft.id) {
                setViewingDraftId(null);
              }
              await refreshStoredDrafts();
            },
          },
        ],
      );
    },
    [outletId, refreshStoredDrafts, viewingDraftId],
  );

  const cartItemCount = useMemo(
    () => cart.reduce((n, i) => n + Number(i.quantity), 0),
    [cart],
  );

  const listBottomPad =
    (cart.length > 0 ? 132 : 20) + Math.max(insets.bottom, 8);

  const getItemCartQty = useCallback(
    (itemId: number) =>
      cart
        .filter(c => c.id === itemId)
        .reduce((sum, c) => sum + Number(c.quantity), 0),
    [cart],
  );

  const quickAddToCart = (item: MenuItem) => {
    if (itemNeedsConfiguration(item)) {
      openItem(item);
      return;
    }
    const price = String(item.net_price || item.price || 0);
    dispatch(
      addItem({
        ...item,
        net_price: price,
        price,
      }),
    );
  };

  const incrementItem = (item: MenuItem) => {
    quickAddToCart(item);
  };

  const decrementItem = (item: MenuItem) => {
    if (itemNeedsConfiguration(item)) {
      openItem(item);
      return;
    }
    const line = cart.find(c => c.id === item.id && !c.lineKey);
    if (!line) {
      return;
    }
    dispatch(
      setItemQuantity({
        id: item.id,
        quantity: line.quantity - 1,
      }),
    );
  };

  const adjustCartLineQty = useCallback(
    (line: (typeof cart)[number], delta: number) => {
      dispatch(
        setItemQuantity({
          id: line.id,
          quantity: line.quantity + delta,
          lineKey: line.lineKey,
        }),
      );
    },
    [dispatch],
  );

  const openItem = (item: MenuItem) => {
    setSelectedItem(item);
    const existing = cart.find(c => c.id === item.id && !c.lineKey);
    setTempQty(existing?.quantity ?? 1);
    setTempNotes(existing?.notes ?? '');
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
      : Number(selectedItem.net_price || selectedItem.net_price || 0);
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

    const lineKey = buildCartLineKey(
      selectedItem.id,
      selectedVariantId,
      selectedAddonIds,
    );

    const configuredItem: MenuItem & { lineKey: string } = {
      ...selectedItem,
      addons: selectedAddons,
      variants: selectedVariant ? [selectedVariant] : [],
      recipeItems: recipePreview,
      net_price: String(dynamicUnitPrice),
      price: String(dynamicUnitPrice),
      lineKey,
    };

    dispatch(addItem(configuredItem));
    dispatch(
      setItemQuantity({ id: selectedItem.id, quantity: tempQty, lineKey }),
    );
    dispatch(
      setItemNotes({ id: selectedItem.id, notes: mergedNotes, lineKey }),
    );
    setSelectedItem(null);
  };

  const submitOrder = async (withInvoice: boolean) => {
    setSubmitError(null);
    if (!cart.length) {
      Alert.alert('Cart empty', 'Add items before submitting.');
      return;
    }
    if (cartState.deliveryType === 'dinein' && !cartState.tableId) {
      Alert.alert('Table required', 'Select a table for dine-in service.');
      return;
    }

    const orderInput = {
      items: cart,
      deliveryType: cartState.deliveryType,
      selectedCustomer: cartState.selectedCustomer,
      tableId: cartState.tableId,
      selectedQrOrderItem: null as string | number | null,
      serviceCharge: data?.serviceCharge,
    };

    const paymentId =
      cartState.selectedPaymentType ?? cashPayment?.id ?? '';
    const paymentTitle =
      paymentTypes.find(pt => String(pt?.id) === String(paymentId))?.title ??
      'Cash';

    const itemsSnapshot = cart.map(line => ({ ...line }));
    const totalItems = itemsSnapshot.reduce(
      (n, line) => n + Number(line.quantity),
      0,
    );
    const storeSettings = (data as PosInitResponse).storeSettings;

    try {
      if (withInvoice) {
        if (!paymentId && paymentTypes.length > 0) {
          Alert.alert('Payment', 'Select a payment type for billing.');
          return;
        }
        const invoiceBody = buildCreateOrderAndInvoiceRequest({
          ...orderInput,
          selectedPaymentType: paymentId,
        });
        const res = await createOrderAndInvoice(invoiceBody).unwrap();
        const tokenNo = parseTokenNo(res);
        const orderId = res.orderId as string | number | undefined;
        const invoiceId = res.invoiceId as string | number | undefined;

        let printOutcome: Awaited<ReturnType<typeof printOnOrderPlaced>> = {
          receipt: {attempted: false, ok: false},
          token: {attempted: false, ok: false},
        };
        try {
          printOutcome = await printOnOrderPlaced({
            printSettings: data?.printSettings,
            storeSettings,
            currency,
            items: itemsSnapshot,
            netTotal: amount.netTotal,
            taxTotal: amount.taxTotal,
            serviceChargeTotal: amount.serviceChargeTotal,
            total: amount.total,
            deliveryType: cartState.deliveryType,
            tableTitle: cartState.selectedTable?.table_title ?? null,
            customerName:
              cartState.selectedCustomer?.name ?? 'Walk-in customer',
            paymentMethod: paymentTitle,
            orderResponse: res,
            invoiceId,
          });
        } catch {
          // Order is already saved; printing is best-effort only.
        }

        setSuccessModal({
          tokenNo,
          formattedToken: String(res.formattedToken ?? formatTokenLabel(res)),
          orderId,
          invoiceId,
          total: amount.total,
          totalItems,
          printed: wasReceiptPrinted(printOutcome),
        });

        dispatch(
          addOrderHistoryItem({
            id: `inv-${orderId}-${Date.now()}`,
            tokenNo,
            orderId,
            invoiceId,
            total: amount.total,
            customerName:
              cartState.selectedCustomer?.name ?? 'Walk-in customer',
            createdAt: new Date().toISOString(),
            status: 'created',
            paymentMethod: paymentTitle,
          }),
        );
      } else {
        const orderBody = buildCreateOrderRequest(orderInput);
        const res = await createOrder(orderBody).unwrap();
        const tokenNo = parseTokenNo(res);
        const orderId = parseOrderId(res.orderId);

        const printOutcome = await printOnOrderPlaced({
          printSettings: data?.printSettings,
          storeSettings,
          currency,
          items: itemsSnapshot,
          netTotal: amount.netTotal,
          taxTotal: amount.taxTotal,
          serviceChargeTotal: amount.serviceChargeTotal,
          total: amount.total,
          deliveryType: cartState.deliveryType,
          tableTitle: cartState.selectedTable?.table_title ?? null,
          customerName:
            cartState.selectedCustomer?.name ?? 'Walk-in customer',
          paymentMethod: paymentTitle,
          orderResponse: res,
        });

        setSuccessModal({
          tokenNo,
          formattedToken: String(res.formattedToken ?? formatTokenLabel(res)),
          orderId,
          total: amount.total,
          totalItems,
          printed: wasReceiptPrinted(printOutcome),
        });

        const skipReason = await getReceiptPrintSkipReason(data?.printSettings);
        const printErr = formatPrintSkippedMessage(printOutcome, skipReason);
        if (printErr) {
          Alert.alert(
            printOutcome.receipt.attempted ? 'Print failed' : 'Print skipped',
            `${printErr}\n\nOrder was saved successfully.`,
          );
        }

        dispatch(
          addOrderHistoryItem({
            id: `ord-${orderId}-${Date.now()}`,
            tokenNo,
            orderId,
            total: amount.total,
            customerName:
              cartState.selectedCustomer?.name ?? 'Walk-in customer',
            createdAt: new Date().toISOString(),
            status: 'created',
            paymentMethod: paymentTitle,
          }),
        );
      }
      playOrderSuccessSound();
      dispatch(clearCart());
      setCartSummaryVisible(false);
    } catch (e: any) {
      const code = e?.data?.code;
      const msg =
        code === 'INVALID_OUTLET'
          ? 'Invalid outlet. Open POS home so the menu loads, then try again. If it persists, log out and sign in again.'
          : (e?.data?.message ?? 'Unable to submit order');
      setSubmitError(msg);
      Alert.alert('Order failed', msg);
    }
  };

  /** Pay & Bill always creates order + invoice (same as web POS). */
  const onPayAndBill = () => submitOrder(true);

  const onSaveDraft = useCallback(async () => {
    if (cart.length === 0) {
      Alert.alert('Cart empty', 'Add items before saving a draft.');
      return;
    }
    const saved = await addPosOrderDraft(outletId, {
      items: cartState.items,
      deliveryType: cartState.deliveryType,
      billMode: cartState.billMode,
      tableId: cartState.tableId,
      selectedPaymentType: cartState.selectedPaymentType,
      selectedCustomer: cartState.selectedCustomer,
      selectedTable: cartState.selectedTable,
    });
    if (!saved) {
      Alert.alert('Could not save', 'Unable to save this order as a draft.');
      return;
    }
    const lineCount = cart.length;
    const totalQty = cart.reduce((n, i) => n + Number(i.quantity), 0);
    dispatch(clearCart());
    const drafts = await refreshStoredDrafts();
    const draftLabel = drafts.length === 1 ? 'draft' : 'drafts';
    const itemLabel = lineCount === 1 ? 'item' : 'items';
    Alert.alert(
      'Successfully',
      `Draft saved successfully.`,
    );
  }, [cart, cartState, dispatch, outletId, refreshStoredDrafts]);

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
    <View style={styles.screenRoot}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <TopHeader
            title=''
            onBack={goBack}
            right={
              <View style={styles.topHeaderRight}>
                <ServiceTypeSelector
                  value={cartState.deliveryType}
                  onChange={v => dispatch(setDeliveryType(v))}
                  iconColor={WARM}
                  iconSize={30}
                />
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={openDraftModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="View saved draft orders">
                  <DraftIcon size={24} color={WARM} />
                  {storedDrafts.length > 0 ? (
                    <View style={styles.headerIconBadge}>
                      <Text style={styles.headerIconBadgeText}>
                        {storedDrafts.length > 9
                          ? '9+'
                          : storedDrafts.length}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={openSearchModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Search">
                  <SearchIcon size={22} color={WARM} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => setMoreMenuVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="More options">
                  <Text style={styles.headerIconText}>⋮</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {submitError ? (
            <Text style={styles.submitError}>{submitError}</Text>
          ) : null}

          <View style={styles.categoryScrollWrap}>
            <ScrollView
              ref={categoryScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                // height: '100%',
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

          {cartState.selectedCustomer && (
            <View style={styles.customerBar}>
              <View style={styles.customerChip}>
                <UserIcon size={18} color={WARM} />
                <Text style={styles.customerChipName} numberOfLines={1}>
                  {cartState.selectedCustomer.name}
                </Text>
                <TouchableOpacity
                  onPress={() => dispatch(setSelectedCustomer(null))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Remove customer">
                  <CloseIcon size={14} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <FlatList
            key={menuViewMode}
            data={menuByCategory}
            keyExtractor={item => String(item.id)}
            numColumns={menuViewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={
              menuViewMode === 'grid' ? styles.gridRow : undefined
            }
            contentContainerStyle={[
              menuViewMode === 'grid' ? styles.gridContent : styles.listContent,
              { paddingBottom: listBottomPad },
            ]}
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
            ItemSeparatorComponent={
              menuViewMode === 'grid'
                ? () => <View style={{ height: 14 }} />
                : undefined
            }
            renderItem={({ item, index }) => {
              const qty = getItemCartQty(item.id);
              const discountPct = getMenuItemDiscountPercent(item);
              const showListPrice = menuItemHasListPrice(item);
              const netFormatted = Number(item.net_price || 0).toFixed(2);
              const listFormatted = Number(item.price || 0).toFixed(2);

              if (menuViewMode === 'list') {
                return (
                  <View
                    style={[
                      styles.listRow,
                      index % 2 === 1 && styles.listRowAlt,
                    ]}>
                    <TouchableOpacity
                      style={styles.listRowMain}
                      activeOpacity={0.92}
                      onPress={() => quickAddToCart(item)}>
                      <View style={styles.listThumb}>
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.listThumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.listThumbPlaceholder}>
                            <UtensilsIcon size={28} color={colors.muted} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.listName} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                    {qty > 0 ? (
                      <View style={styles.listQtyStepper}>
                        <TouchableOpacity
                          style={styles.listQtyStepperBtn}
                          onPress={() => decrementItem(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MinusIcon size={18} color={WARM} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.listQtyStepperValue}>{qty}</Text>
                        <TouchableOpacity
                          style={[
                            styles.listQtyStepperBtn,
                            styles.listQtyStepperBtnPlus,
                          ]}
                          onPress={() => incrementItem(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <PlusIcon size={18} color={WARM} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.listAddBtn}
                        onPress={() => incrementItem(item)}
                        activeOpacity={0.85}>
                        <View style={styles.gridAddBtnRing}>
                          <PlusIcon size={20} color={colors.white} strokeWidth={2.5} />
                        </View>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.listPrice}>
                      {currency}{netFormatted}
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.gridCard}>
                  {discountPct != null ? (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {discountPct}% Off
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => quickAddToCart(item)}>
                    <View style={styles.gridImageWrap}>
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.gridImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.gridImagePlaceholder}>
                          <UtensilsIcon size={28} color={colors.muted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.gridCardBody}>
                      <Text style={styles.gridTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.gridPriceRow}>
                        <Text style={styles.gridPrice}>
                          {currency} {netFormatted}
                        </Text>
                        {showListPrice ? (
                          <Text style={styles.gridPriceOriginal}>
                            {currency} {listFormatted}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                  {qty > 0 ? (
                    <View style={styles.gridQtyStepper}>
                      <TouchableOpacity
                        style={styles.gridQtyStepperBtn}
                        onPress={() => decrementItem(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MinusIcon size={18} color={WARM} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.gridQtyStepperValue}>{qty}</Text>
                      <TouchableOpacity
                        style={[
                          styles.gridQtyStepperBtn,
                          styles.gridQtyStepperBtnPlus,
                        ]}
                        onPress={() => incrementItem(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <PlusIcon size={18} color={WARM} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.gridAddBtn}
                      onPress={() => incrementItem(item)}
                      activeOpacity={0.85}
                      accessibilityLabel="Add to cart">
                      <View style={styles.gridAddBtnRing}>
                        <PlusIcon size={20} color={colors.white} strokeWidth={2.5} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />

          {cart.length > 0 && (
            <View
              style={[
                styles.cartDockContainer,
                { paddingBottom: Math.max(insets.bottom, 8) },
              ]}>
              {paymentTypes.length > 0
                ? renderCartPaymentTypes(paymentTypes)
                : null}
              <View style={styles.cartDock}>
                <TouchableOpacity
                  style={styles.cartSummaryLeft}
                  onPress={openCartSummary}
                  activeOpacity={0.85}>
                  <View>
                    <Text style={styles.cartItemsLine}>
                      {cart.length} Items
                    </Text>
                    <Text style={styles.cartQtyLine}>Qty: {cartItemCount}</Text>
                  </View>
                  <Text style={styles.cartChevron}>▾</Text>
                </TouchableOpacity>
                <View style={styles.cartTotalBlock}>
                  <Text style={styles.cartBarTotalLabel}>Total</Text>
                  <View style={styles.cartTotalRow}>
                    <Text style={styles.cartBarTotal}>
                      {currency} {amount.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.draftBtn}
                  onPress={onSaveDraft}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Save order draft">
                  <DraftIcon size={22} color={WHITE} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.payBillBtn}
                  onPress={onPayAndBill}
                  disabled={isSubmitting}
                  activeOpacity={0.9}>
                  {isSubmitting ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <View style={styles.payBillBtnInner}>
                      {selectedPayment ? (
                        <PaymentTypeIcon
                          title={selectedPayment.title}
                          icon={selectedPayment.icon}
                          size={18}
                        />
                      ) : null}
                      <Text style={styles.payBillText}>Pay & Bill</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Modal
            visible={draftModalVisible}
            animationType="slide"
            onRequestClose={closeDraftModal}>
            <SafeAreaView style={styles.draftModalSafe} edges={['top', 'bottom']}>
              <View style={styles.draftModalHeader}>
                {viewingDraft ? (
                  <TouchableOpacity
                    onPress={() => setViewingDraftId(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <ChevronLeftIcon size={22} color={colors.navy} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.draftModalHeaderSpacer} />
                )}
                <Text style={styles.draftModalTitle}>
                  {viewingDraft ? 'Draft order' : `Saved orders (${storedDrafts.length})`}
                </Text>
                <TouchableOpacity
                  onPress={closeDraftModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close draft list">
                  <CloseIcon size={20} color={colors.navy} />
                </TouchableOpacity>
              </View>

              {draftModalLoading ? (
                <View style={styles.draftModalCenter}>
                  <ActivityIndicator size="large" color={ACCENT} />
                </View>
              ) : storedDrafts.length === 0 ? (
                <View style={styles.draftModalCenter}>
                  <Text style={styles.draftModalEmptyTitle}>No saved orders</Text>
                  <Text style={styles.draftModalEmptyText}>
                    Tap Draft in the cart bar to save the current order as a new
                    draft. Each save keeps a separate order.
                  </Text>
                </View>
              ) : viewingDraft ? (
                <>
                  <View style={styles.draftModalMeta}>
                    <Text style={styles.draftModalMetaLine}>
                      {draftOrderMeta(viewingDraft).lineCount} line
                      {draftOrderMeta(viewingDraft).lineCount === 1 ? '' : 's'} ·{' '}
                      {draftOrderMeta(viewingDraft).itemCount} qty ·{' '}
                      {viewingDraft.deliveryType}
                      {viewingDraft.selectedCustomer?.name
                        ? ` · ${viewingDraft.selectedCustomer.name}`
                        : ''}
                    </Text>
                    <Text style={styles.draftModalMetaSub}>
                      Saved{' '}
                      {new Date(viewingDraft.savedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>

                  <FlatList
                    data={viewingDraft.items}
                    keyExtractor={(item, index) =>
                      item.lineKey ?? `${item.id}-${index}`
                    }
                    contentContainerStyle={styles.draftModalList}
                    renderItem={({ item }) => {
                      const lineTotal =
                        Number(item.net_price || item.price || 0) *
                        item.quantity;
                      return (
                        <View style={[styles.draftRow, cardShadow]}>
                          <View style={styles.draftRowMain}>
                            <Text style={styles.draftRowTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            {item.notes ? (
                              <Text style={styles.draftRowNotes} numberOfLines={2}>
                                {item.notes}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.draftRowRight}>
                            <Text style={styles.draftRowQty}>×{item.quantity}</Text>
                            <Text style={styles.draftRowPrice}>
                              {currency} {lineTotal.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      );
                    }}
                  />

                  <View style={styles.draftModalFooter}>
                    {viewingDraftAmount ? (
                      <View style={styles.draftModalTotalRow}>
                        <Text style={styles.draftModalTotalLabel}>Total</Text>
                        <Text style={styles.draftModalTotalValue}>
                          {currency} {viewingDraftAmount.total.toFixed(2)}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.draftRestoreBtn}
                      onPress={() => onRestoreDraft(viewingDraft)}
                      activeOpacity={0.9}>
                      <Text style={styles.draftRestoreBtnText}>
                        Restore to cart
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDeleteDraft(viewingDraft)}
                      style={styles.draftDeleteBtn}
                      activeOpacity={0.85}>
                      <Text style={styles.draftDeleteBtnText}>Delete this order</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <FlatList
                  data={storedDrafts}
                  keyExtractor={d => d.id}
                  contentContainerStyle={styles.draftOrdersList}
                  renderItem={({ item: draft, index }) => {
                    const meta = draftOrderMeta(draft);
                    const rate = resolveServiceChargeRate(
                      draft.deliveryType,
                      data?.serviceCharge,
                    );
                    const amount = computeCartAmount(draft.items, rate);
                    return (
                      <TouchableOpacity
                        style={[styles.draftOrderCard, cardShadow]}
                        activeOpacity={0.88}
                        onPress={() => setViewingDraftId(draft.id)}>
                        <View style={styles.draftOrderCardTop}>
                          <Text style={styles.draftOrderCardTitle}>
                            Order {storedDrafts.length - index}
                          </Text>
                          <Text style={styles.draftOrderCardTotal}>
                            {currency} {amount.total.toFixed(2)}
                          </Text>
                        </View>
                        <Text style={styles.draftOrderCardMeta}>
                          {meta.lineCount} line{meta.lineCount === 1 ? '' : 's'} ·{' '}
                          {meta.itemCount} qty · {draft.deliveryType}
                        </Text>
                        {draft.selectedCustomer?.name ? (
                          <Text style={styles.draftOrderCardCustomer} numberOfLines={1}>
                            {draft.selectedCustomer.name}
                          </Text>
                        ) : null}
                        <Text style={styles.draftOrderCardWhen}>
                          {new Date(draft.savedAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </Text>
                        <View style={styles.draftOrderCardActions}>
                          <TouchableOpacity
                            style={styles.draftOrderCardRestore}
                            onPress={() => onRestoreDraft(draft)}
                            activeOpacity={0.85}>
                            <Text style={styles.draftOrderCardRestoreText}>
                              Restore
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.draftOrderCardDelete}
                            onPress={() => onDeleteDraft(draft)}
                            activeOpacity={0.85}>
                            <Text style={styles.draftOrderCardDeleteText}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </SafeAreaView>
          </Modal>

          <Modal
            visible={moreMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={closeMoreMenu}>
            <View style={styles.moreMenuBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeMoreMenu}
                accessibilityLabel="Close menu"
              />
              <View
                style={[
                  styles.moreMenuCard,
                  { top: insets.top + 8, right: spacing.md },
                ]}>
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={onMoreCustomer}
                  activeOpacity={0.85}>
                  <UserIcon size={20} color={colors.navy} />
                  <Text style={styles.moreMenuItemText}>Customer</Text>
                </TouchableOpacity>
                <View style={styles.moreMenuDivider} />
                <View style={styles.moreMenuDivider} />
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={onMoreOrders}
                  activeOpacity={0.85}>
                  <ClipboardIcon size={20} color={colors.navy} />
                  <Text style={styles.moreMenuItemText}>Orders</Text>
                </TouchableOpacity>
                <View style={styles.moreMenuDivider} />
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  onPress={onMoreToggleView}
                  activeOpacity={0.85}>
                  {menuViewMode === 'grid' ? (
                    <MenuIcon size={20} color={colors.navy} />
                  ) : (
                    <GridIcon size={20} color={colors.navy} />
                  )}
                  <Text style={styles.moreMenuItemText}>
                    {menuViewMode === 'grid' ? 'List view' : 'Grid view'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={cartSummaryVisible}
            animationType="slide"
            onRequestClose={() => setCartSummaryVisible(false)}>
            <SafeAreaView style={styles.cartSummarySafe} edges={['top', 'bottom']}>
              <View style={styles.cartSummaryHeader}>
                <View style={styles.cartSummaryHeaderSpacer} />
                <View style={styles.cartSummaryHeaderCenter}>
                  <Text style={styles.cartSummaryTitle}>Order summary</Text>
                  <Text style={styles.cartSummarySubtitle}>
                    {cart.length} line{cart.length === 1 ? '' : 's'} ·{' '}
                    {cartItemCount} qty
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCartSummaryVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close order summary">
                  <CloseIcon size={20} color={colors.navy} />
                </TouchableOpacity>
              </View>

              {cartState.selectedCustomer ? (
                <View style={styles.cartSummaryMeta}>
                  <UserIcon size={16} color={colors.muted} />
                  <Text style={styles.cartSummaryMetaText} numberOfLines={1}>
                    {cartState.selectedCustomer.name}
                    {cartState.selectedCustomer.phone
                      ? ` · ${cartState.selectedCustomer.phone}`
                      : ''}
                  </Text>
                </View>
              ) : null}

              <FlatList
                style={styles.cartSummaryListFlex}
                data={cart}
                keyExtractor={(item, index) =>
                  item.lineKey ?? `${item.id}-${index}`
                }
                contentContainerStyle={styles.cartSummaryList}
                ItemSeparatorComponent={() => (
                  <View style={styles.cartSummarySeparator} />
                )}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const lineKey = item.lineKey;
                  const unitPrice = Number(item.net_price || item.price || 0);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <View style={[styles.cartSummaryRow, cardShadow]}>
                      <View style={styles.cartSummaryRowHeader}>
                        <Text
                          style={styles.cartSummaryRowTitle}
                          numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.cartSummaryRowPrice}>
                          {currency} {lineTotal.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.cartSummaryRowMid}>
                        <Text style={styles.cartSummaryRowUnit}>
                          {currency} {unitPrice.toFixed(2)} each
                        </Text>
                        <View style={styles.searchQtyStepper}>
                          <TouchableOpacity
                            style={styles.searchQtyStepperBtn}
                            onPress={() => adjustCartLineQty(item, -1)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Decrease quantity">
                            <MinusIcon
                              size={16}
                              color={WARM}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>
                          <Text style={styles.searchQtyStepperValue}>
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.searchQtyStepperBtn,
                              styles.searchQtyStepperBtnPlus,
                            ]}
                            onPress={() => adjustCartLineQty(item, 1)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Increase quantity">
                            <PlusIcon
                              size={16}
                              color={colors.white}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.cartSummaryNoteBlock}>
                        <Text style={styles.cartSummaryNoteLabel}>
                          Item note
                        </Text>
                        <TextInput
                          style={styles.cartSummaryNoteInput}
                          value={item.notes ?? ''}
                          onChangeText={text =>
                            dispatch(
                              setItemNotes({
                                id: item.id,
                                notes: text,
                                lineKey,
                              }),
                            )
                          }
                          placeholder="Kitchen instructions, spice level, etc."
                          placeholderTextColor={colors.mutedLight}
                          multiline
                        />
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.cartSummaryEmpty}>
                    <Text style={styles.cartSummaryEmptyText}>
                      Your cart is empty.
                    </Text>
                  </View>
                }
              />

              {cart.length > 0 ? (
                <View style={styles.cartSummaryFooter}>
                  {amount.taxTotal > 0 ? (
                    <View style={styles.cartSummaryBreakdownRow}>
                      <Text style={styles.cartSummaryBreakdownLabel}>Tax</Text>
                      <Text style={styles.cartSummaryBreakdownValue}>
                        {currency} {amount.taxTotal.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  {amount.serviceChargeTotal > 0 ? (
                    <View style={styles.cartSummaryBreakdownRow}>
                      <Text style={styles.cartSummaryBreakdownLabel}>
                        Service charge
                      </Text>
                      <Text style={styles.cartSummaryBreakdownValue}>
                        {currency} {amount.serviceChargeTotal.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.cartSummaryTotalRow}>
                    <Text style={styles.cartSummaryTotalLabel}>Total</Text>
                    <Text style={styles.cartSummaryTotalValue}>
                      {currency} {amount.total.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cartSummaryActions}>
                    <TouchableOpacity
                      style={[
                        styles.cartSummaryPayBillBtn,
                        isSubmitting && styles.cartSummaryPayBillBtnDisabled,
                      ]}
                      onPress={onPayAndBill}
                      disabled={isSubmitting}
                      activeOpacity={0.9}>
                      {isSubmitting ? (
                        <ActivityIndicator color={WHITE} size="small" />
                      ) : (
                        <View style={styles.payBillBtnInner}>
                          {selectedPayment ? (
                            <PaymentTypeIcon
                              title={selectedPayment.title}
                              icon={selectedPayment.icon}
                              size={18}
                            />
                          ) : null}
                          <Text style={styles.payBillText}>Pay & Bill</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cartSummaryDoneBtn}
                      onPress={() => setCartSummaryVisible(false)}
                      disabled={isSubmitting}
                      activeOpacity={0.9}>
                      <Text style={styles.cartSummaryDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </SafeAreaView>
          </Modal>

          <CustomerPickerModal
            visible={customerModalVisible}
            selected={cartState.selectedCustomer}
            onSelect={c => dispatch(setSelectedCustomer(c))}
            onClose={() => setCustomerModalVisible(false)}
          />

          <Modal
            visible={searchModalVisible}
            animationType="slide"
            onRequestClose={closeSearchModal}>
            <SafeAreaView style={styles.searchModalSafe} edges={['top', 'bottom']}>
              <View style={styles.searchModalHeader}>
                <TouchableOpacity
                  style={styles.searchModalClose}
                  onPress={closeSearchModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <CloseIcon size={22} color={colors.navy} />
                </TouchableOpacity>
                <View style={styles.searchModalInputWrap}>
                  <View style={styles.searchModalInputIcon}>
                    <SearchIcon size={20} color={colors.muted} />
                  </View>
                  <TextInput
                    ref={modalSearchInputRef}
                    style={styles.searchModalInput}
                    placeholder="Search product by name / barcode"
                    placeholderTextColor={colors.mutedLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <CloseIcon size={16} color={colors.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <FlatList
                data={searchResults}
                keyExtractor={item => String(item.id)}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.searchModalList}
                ListHeaderComponent={
                  searchQuery.trim() ? (
                    <Text style={styles.searchModalCount}>
                      {searchResults.length} result
                      {searchResults.length === 1 ? '' : 's'}
                    </Text>
                  ) : (
                    <Text style={styles.searchModalHint}>
                      Type a dish name to search the menu
                    </Text>
                  )
                }
                ListEmptyComponent={
                  searchQuery.trim() ? (
                    <View style={styles.searchModalEmpty}>
                      <Text style={styles.searchModalEmptyTitle}>No matches</Text>
                      <Text style={styles.searchModalEmptyText}>
                        Try another name or check spelling
                      </Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const qty = getItemCartQty(item.id);
                  const needsConfig = itemNeedsConfiguration(item);
                  return (
                    <View style={[styles.searchResultRow, cardShadow]}>
                      <TouchableOpacity
                        style={styles.searchResultMain}
                        activeOpacity={needsConfig ? 0.85 : 1}
                        onPress={() => {
                          if (needsConfig) {
                            closeSearchModal();
                            openItem(item);
                          }
                        }}>
                        <View style={styles.searchResultThumb}>
                          {item.image ? (
                            <Image
                              source={{ uri: item.image }}
                              style={styles.searchResultImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.searchResultImagePh}>
                              <UtensilsIcon size={20} color={colors.muted} />
                            </View>
                          )}
                        </View>
                        <View style={styles.searchResultBody}>
                          <Text style={styles.searchResultTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.searchResultMeta} numberOfLines={1}>
                            {item.category_title}
                          </Text>
                          <Text style={styles.searchResultPrice}>
                            {currency} {Number(item.net_price || 0).toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {qty > 0 ? (
                        <View style={styles.searchQtyStepper}>
                          <TouchableOpacity
                            style={styles.searchQtyStepperBtn}
                            onPress={() => decrementItem(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Decrease quantity">
                            <MinusIcon size={16} color={WARM} strokeWidth={2.5} />
                          </TouchableOpacity>
                          <Text style={styles.searchQtyStepperValue}>{qty}</Text>
                          <TouchableOpacity
                            style={[
                              styles.searchQtyStepperBtn,
                              styles.searchQtyStepperBtnPlus,
                            ]}
                            onPress={() => incrementItem(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Increase quantity">
                            <PlusIcon size={16} color={WARM} strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.searchResultAdd}
                          onPress={() => incrementItem(item)}
                          activeOpacity={0.85}
                          accessibilityLabel="Add to cart">
                          <PlusIcon size={18} color={colors.white} strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            </SafeAreaView>
          </Modal>

          <Modal
            visible={!!successModal}
            transparent
            animationType="fade"
            onRequestClose={() => setSuccessModal(null)}>
            <View style={styles.successOverlay}>
              <View style={[styles.successCard, cardShadow]}>
                <View style={styles.successIconWrap}>
                  <CheckIcon size={30} color={colors.white} strokeWidth={3} />
                </View>
                <Text style={styles.successTitle}>Order confirmed</Text>
                <Text style={styles.successSubtitle}>
                  Your order has been placed successfully
                </Text>

                {successModal ? (
                  <>
                    <View style={styles.successTokenCard}>
                      <Text style={styles.successTokenLabel}>Order ID</Text>
                      <Text style={styles.successToken} numberOfLines={2}>
                        #{successModal.formattedToken || '—'}
                      </Text>
                    </View>

                    <View style={styles.successSummaryCard}>
                      <View style={styles.successSummaryRow}>
                        <Text style={styles.successSummaryLabel}>Total</Text>
                        <Text style={styles.successTotal}>
                          {currency} {successModal.total.toFixed(2)}
                        </Text>
                      </View>
                      {successModal.totalItems > 0 ? (
                        <Text style={styles.successItemsMeta}>
                          {successModal.totalItems} item
                          {successModal.totalItems === 1 ? '' : 's'}
                        </Text>
                      ) : null}
                    </View>

                    {successModal.printed ? (
                      <View style={styles.successPrintBanner}>
                        <PrinterIcon size={16} color={colors.green} />
                        <Text style={styles.successPrintBannerText}>
                          Receipt sent to your Bluetooth printer
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.successBtn}
                  onPress={() => setSuccessModal(null)}
                  activeOpacity={0.9}>
                  <Text style={styles.successBtnText}>New order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!selectedItem}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedItem(null)}>
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
                      <UtensilsIcon size={40} color={colors.muted} />
                    </View>
                  )}
                  <View style={styles.modalHeroBar}>
                    <TouchableOpacity onPress={() => setSelectedItem(null)}>
                      <CloseIcon size={22} color={colors.navy} />
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
                        <MinusIcon size={22} color={WARM} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{tempQty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyCircle, styles.qtyCirclePlus]}
                        onPress={() => setTempQty(q => q + 1)}>
                        <PlusIcon size={22} color={WARM} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.modalPrice}>
                    {currency} {dynamicUnitPrice.toFixed(2)}
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
                    <InfoIcon size={18} color={colors.muted} />
                    <Text style={styles.modalAllergyText}>
                      Allergies: verify with kitchen · {selectedItem?.category_title}
                    </Text>
                  </View>
                  <TextInput
                    value={tempNotes}
                    onChangeText={setTempNotes}
                    style={styles.notesInput}
                    placeholder="Special requests / notes"
                    placeholderTextColor={colors.mutedLight}
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
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: BG,
  },
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
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: 200,
  },
  customerBar: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ACCENT}14`,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${ACCENT}40`,
  },
  customerChipIcon: { fontSize: 16 },
  customerChipName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: WARM,
  },
  customerChipRemove: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '700',
  },
  customerAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  customerAddIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: ACCENT,
  },
  customerAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  cartSummarySafe: {
    flex: 1,
    backgroundColor: MENU_BG,
  },
  cartSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: WHITE,
  },
  cartSummaryHeaderSpacer: { width: 32 },
  cartSummaryHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  cartSummaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WARM,
    textAlign: 'center',
  },
  cartSummarySubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  cartSummaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cartSummaryMetaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: WARM,
  },
  cartSummaryListFlex: { flex: 1 },
  cartSummaryList: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cartSummarySeparator: { height: spacing.sm },
  cartSummaryRow: {
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cartSummaryRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cartSummaryRowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: WARM,
    lineHeight: 20,
  },
  cartSummaryRowPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: ACCENT,
  },
  cartSummaryRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cartSummaryRowUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  cartSummaryNoteBlock: {
    marginTop: spacing.md,
    gap: 6,
  },
  cartSummaryNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cartSummaryNoteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 13,
    color: WARM,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  cartSummaryEmpty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  cartSummaryEmptyText: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '600',
  },
  cartSummaryFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  cartSummaryBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartSummaryBreakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  cartSummaryBreakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: WARM,
  },
  cartSummaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  cartSummaryTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  cartSummaryTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: WARM,
  },
  cartSummaryActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cartSummaryPayBillBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cartSummaryPayBillBtnDisabled: {
    opacity: 0.7,
  },
  cartSummaryDoneBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cartSummaryDoneText: {
    fontSize: 15,
    fontWeight: '800',
    color: WARM,
  },
  draftModalSafe: {
    flex: 1,
    backgroundColor: MENU_BG,
  },
  draftModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: WHITE,
  },
  draftModalHeaderSpacer: { width: 32 },
  draftModalBack: {
    width: 32,
    fontSize: 22,
    fontWeight: '700',
    color: WARM,
  },
  draftModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: WARM,
    textAlign: 'center',
  },
  draftModalClose: {
    width: 32,
    fontSize: 22,
    color: MUTED,
    fontWeight: '600',
    textAlign: 'right',
  },
  draftOrdersList: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  draftOrderCard: {
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  draftOrderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  draftOrderCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WARM,
  },
  draftOrderCardTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: ACCENT,
  },
  draftOrderCardMeta: {
    marginTop: 6,
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  draftOrderCardCustomer: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: WARM,
  },
  draftOrderCardWhen: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
  },
  draftOrderCardActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  draftOrderCardRestore: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: `${ACCENT}18`,
    alignItems: 'center',
  },
  draftOrderCardRestoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT,
  },
  draftOrderCardDelete: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
  },
  draftOrderCardDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  draftModalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  draftModalEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WARM,
  },
  draftModalEmptyText: {
    marginTop: 8,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  draftModalMeta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  draftModalMetaLine: {
    fontSize: 14,
    fontWeight: '700',
    color: WARM,
    textTransform: 'capitalize',
  },
  draftModalMetaSub: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
  },
  draftModalList: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: 10,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  draftRowMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  draftRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WARM,
  },
  draftRowNotes: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },
  draftRowRight: {
    alignItems: 'flex-end',
  },
  draftRowQty: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
  },
  draftRowPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT,
  },
  draftModalFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  draftModalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  draftModalTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  draftModalTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: WARM,
  },
  draftRestoreBtn: {
    backgroundColor: ACCENT,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  draftRestoreBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  draftDeleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  draftDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIconBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerIconBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: WHITE,
  },
  headerIconText: {
    fontSize: 26,
    color: WARM,
    fontWeight: '600',
  },
  moreMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  moreMenuCard: {
    position: 'absolute',
    minWidth: 200,
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  moreMenuItemIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  moreMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: WARM,
  },
  moreMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: 4,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 40,
    paddingRight: 44,
    minHeight: 46,
  },
  searchIconLeft: {
    position: 'absolute',
    left: 14,
    fontSize: 17,
    color: MUTED,
  },
  searchPlaceholderText: {
    flex: 1,
    fontSize: 14,
    color: colors.mutedLight,
    paddingVertical: 12,
  },
  categoryScrollWrap: {
    height: 50,
    marginTop: 0,
    paddingBottom: 10,
    borderBottomWidth: .8,
    borderBottomColor: '#e0e0e0',
  },
  searchModalSafe: {
    flex: 1,
    backgroundColor: BG,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchModalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModalCloseText: {
    fontSize: 18,
    color: MUTED,
    fontWeight: '700',
  },
  searchModalInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchModalInputIcon: {
    marginRight: 8,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 15,
    color: WARM,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  searchModalClear: {
    fontSize: 16,
    color: MUTED,
    paddingLeft: 8,
  },
  searchModalList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
  searchModalHint: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 12,
  },
  searchModalCount: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  searchModalEmpty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  searchModalEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WARM,
  },
  searchModalEmptyText: {
    marginTop: 8,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 10,
  },
  searchResultMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  searchQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(ACCENT, 0.08),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withOpacity(ACCENT, 0.24),
    overflow: 'hidden',
    marginLeft: 8,
  },
  searchQtyStepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(ACCENT, 0.16),
  },
  searchQtyStepperBtnPlus: {
    backgroundColor: ACCENT,
  },
  searchQtyStepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: -2,
  },
  searchQtyStepperBtnTextPlus: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
    marginTop: -2,
  },
  searchQtyStepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: WARM,
    paddingHorizontal: 4,
  },
  searchResultThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginRight: 12,
  },
  searchResultImage: {
    width: '100%',
    height: '100%',
  },
  searchResultImagePh: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultBody: {
    flex: 1,
    paddingRight: 8,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WARM,
  },
  searchResultMeta: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
  },
  searchResultPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT,
  },
  searchResultAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAddText: {
    fontSize: 22,
    fontWeight: '700',
    color: WHITE,
    marginTop: -2,
  },
  searchBarcodeBtn: {
    position: 'absolute',
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  searchBarcodeIcon: {
    fontSize: 16,
    color: MUTED,
    fontWeight: '700',
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
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: WARM,
    lineHeight: 18,
  },
  categoryPillTextActive: { color: WHITE },
  gridToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  gridToggleBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  gridToggleIcon: {
    fontSize: 18,
    color: WARM,
    fontWeight: '700',
  },
  gridToggleIconActive: {
    color: WHITE,
  },
  optionsSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  optionsSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WARM,
    marginBottom: 16,
  },
  optionsTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionsTableValue: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  optionsDoneBtn: {
    marginTop: 20,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  optionsDoneText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  optionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  optionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionPillHalf: {
    flex: 1,
    alignItems: 'center',
  },
  optionPillOn: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: WARM,
  },
  optionPillTextOn: {
    color: WHITE,
  },
  submitError: {
    marginHorizontal: 16,
    marginBottom: 4,
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    backgroundColor: MENU_BG,
  },
  listContent: {
    backgroundColor: MENU_BG,
  },
  gridRow: { gap: 12 },
  placeholderGlyph: { fontSize: 28, opacity: 0.35 },
  gridCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 200,
    paddingBottom: 44,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
  },
  gridImageWrap: {
    width: '100%',
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 10,
  },
  gridCardBody: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.black,
    lineHeight: 19,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingRight: 8,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: ACCENT,
  },
  gridPriceOriginal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.black,
    textDecorationLine: 'line-through',
  },
  gridAddBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 46,
    height: 46,
    backgroundColor: ACCENT,
    borderTopLeftRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAddBtnRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAddBtnText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  gridQtyStepper: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(ACCENT, 0.12),
    borderTopLeftRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(ACCENT, 0.35),
    borderRightWidth: 0,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  gridQtyStepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(ACCENT, 0.2),
  },
  gridQtyStepperBtnPlus: {
    backgroundColor: withOpacity(ACCENT, 0.2),
  },
  gridQtyStepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: -2,
  },
  gridQtyStepperBtnTextPlus: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: -2,
  },
  gridQtyStepperValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: WARM,
    paddingHorizontal: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingRight: spacing.lg,
    minHeight: 72,
  },
  listRowAlt: {
    backgroundColor: colors.borderLight,
  },
  listRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: spacing.lg,
    minWidth: 0,
  },
  listThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  listThumbImage: {
    width: '100%',
    height: '100%',
  },
  listThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  listName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: WARM,
  },
  listPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: WARM,
    marginLeft: 8,
    marginRight: 10,
    minWidth: 72,
    textAlign: 'right',
  },
  listAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 2,
  },
  listAddBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  listAddBtnChevron: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    marginTop: -1,
  },
  listQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(ACCENT, 0.12),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withOpacity(ACCENT, 0.35),
    overflow: 'hidden',
  },
  listQtyStepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(ACCENT, 0.2),
  },
  listQtyStepperBtnPlus: {
    backgroundColor: ACCENT,
  },
  listQtyStepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: PRICE_HIGHLIGHT,
    marginTop: -2,
  },
  listQtyStepperBtnTextPlus: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
    marginTop: -2,
  },
  listQtyStepperValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: WARM,
    paddingHorizontal: 2,
  },
  cartDockContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  cartPaymentScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  cartPaymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    maxWidth: 120,
  },
  cartPaymentChipActive: {
    borderColor: ACCENT,
    backgroundColor: withOpacity(ACCENT, 0.1),
  },
  cartPaymentChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WARM,
    flexShrink: 1,
  },
  cartPaymentChipLabelActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  cartDock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  payBillBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    marginLeft:9
  },
  cartIcon: { fontSize: 20 },
  cartItemsLine: {
    fontSize: 13,
    fontWeight: '800',
    color: WARM,
  },
  cartQtyLine: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    marginTop: 1,
  },
  cartChevron: {
    fontSize: 12,
    color: MUTED,
    marginLeft: 2,
  },
  cartTotalBlock: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  cartTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartInfoIcon: {
    fontSize: 13,
    color: MUTED,
  },
  draftBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBillBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 108,
    flexShrink: 1,
  },
  payBillText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  cartBarTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'right',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  successCard: {
    backgroundColor: WHITE,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WARM,
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  successTokenCard: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#E8F8ED',
    borderWidth: 1,
    borderColor: withOpacity(ACCENT, 0.2),
    alignItems: 'center',
  },
  successTokenLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  successToken: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '900',
    color: WARM,
    textAlign: 'center',
    lineHeight: 32,
  },
  successSummaryCard: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  successSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  successSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  successMeta: {
    marginTop: 8,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
  successItemsMeta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  successTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: ACCENT,
  },
  successPrintBanner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#E8F8ED',
  },
  successPrintBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.greenDark,
    lineHeight: 18,
  },
  printNote: {
    marginTop: 12,
    fontSize: 13,
    color: colors.green,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBtn: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    minHeight: 48,
  },
  successBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },
  cartBarTotal: { color: WARM, fontSize: 15, fontWeight: '800' },
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
  error: { color: colors.error, marginBottom: 12 },
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
    borderBottomColor: colors.border,
  },
  tableRowActive: {
    backgroundColor: withOpacity(PRICE_HIGHLIGHT, 0.12),
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tableRowTitle: { fontSize: 16, fontWeight: '700', color: WARM },
  tableRowSub: { marginTop: 4, fontSize: 13, color: MUTED },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  modalHero: { height: 220, backgroundColor: colors.background },
  modalImage: { width: '100%', height: '100%' },
  modalImagePh: { alignItems: 'center', justifyContent: 'center' },
  modalPhGlyph: { fontSize: 56, opacity: 0.25 },
  modalHeroBar: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    height: 35,
    width:  35,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBack: {
    fontSize: 22,
    color: WARM,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalMore: {
    fontSize: 18,
    color: WARM,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.92)',
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
    color: WARM,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  qtyCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: withOpacity(ACCENT, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCirclePlus: { backgroundColor: withOpacity(ACCENT, 0.18)},
  qtyCircleText: {
    fontSize: 20,
    fontWeight: '700',
    color: PRICE_HIGHLIGHT,
    marginTop: -1,
  },
  qtyCircleTextPlus: { color: WHITE },
  qtyValue: { color: WARM, fontSize: 17, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  modalPrice: { marginTop: 10, color: WARM, fontSize: 22, fontWeight: '800' },
  modalDesc: {
    marginTop: 12,
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  modalSectionTitle: {
    marginTop: 14,
    color: WARM,
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
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
  },
  choiceChipActive: {
    backgroundColor: withOpacity(ACCENT, 0.12),
    borderColor: ACCENT,
  },
  choiceText: {
    color: WARM,
    fontSize: 12,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  recipeLine: {
    marginTop: 4,
    color: MUTED,
    fontSize: 12,
  },
  modalAllergy: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  modalAllergyIcon: { color: MUTED, fontSize: 14 },
  modalAllergyText: {
    flex: 1,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  notesInput: {
    marginTop: 16,
    backgroundColor: colors.background,
    color: WARM,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
