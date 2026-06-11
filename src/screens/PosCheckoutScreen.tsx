import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  useAddCustomerMutation,
  useSearchCustomersQuery,
} from '../services/customerApi';
import {useGetPosInitQuery} from '../services/posApi';
import {
  clearCart,
  removeItem,
  setBillMode,
  setDeliveryType,
  setItemNotes,
  setItemQuantity,
  setPaymentType,
  setSelectedCustomer,
} from '../features/cartSlice';
import type {DeliveryType} from '../features/cartSlice';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {usePosOrderDraftHydration} from '../hooks/usePosOrderDraftHydration';
import {
  useCreateOrderAndInvoiceMutation,
  useCreateOrderMutation,
} from '../services/orderApi';
import {addOrderHistoryItem} from '../features/orderHistorySlice';
import type {PosStackParamList} from '../navigation/types';
import {
  CheckIcon,
  ChevronLeftIcon,
  MinusIcon,
  PlusIcon,
  GradientButton,
  ScreenBackground,
} from '../components/ui';
import {cardShadow, colors} from '../theme';
import {
  isTablet,
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';
import {
  formatPrintSkippedMessage,
  printOnOrderPlaced,
  wasReceiptPrinted,
} from '../services/orderPlacementPrint';
import {getReceiptPrintSkipReason} from '../utils/printConfig';
import {
  buildCreateOrderAndInvoiceRequest,
  buildCreateOrderRequest,
  computeCartAmount,
  parseOrderId,
  parseTokenNo,
  resolveServiceChargeRate,
} from '../utils/posOrder';
import {resolveCurrencySymbol} from '../utils/currency';

const BG = colors.background;
const CHARCOAL = colors.navy;
const WARM = colors.navy;
const MUTED = colors.muted;
const ACCENT = colors.green;
const WHITE = colors.white;

const DELIVERY_OPTIONS: {key: DeliveryType; label: string; hint: string}[] = [
  {key: 'dinein', label: 'Dine-in', hint: 'Table required'},
  {key: 'takeaway', label: 'Takeaway', hint: 'Pick up at counter'},
  {key: 'delivery', label: 'Delivery', hint: 'Send to customer'},
];

type Nav = NativeStackNavigationProp<PosStackParamList, 'PosCheckout'>;

export const PosCheckoutScreen: React.FC = () => {
  usePosOrderDraftHydration();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const cart = useAppSelector(state => state.cart);
  const [query, setQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    phone: '',
    name: '',
    email: '',
    birthDate: '1990-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
  });
  const [useInvoice, setUseInvoice] = useState(
    () => cart.billMode === 'invoice',
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successModal, setSuccessModal] = useState<{
    tokenNo: number;
    orderId: number;
    invoiceId?: number;
    total: number;
    customerName: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const {data: posInit} = useGetPosInitQuery();
  const {data: customers = []} = useSearchCustomersQuery(query, {
    skip: query.trim().length < 1,
  });
  const [addCustomer, {isLoading: isAddingCustomer}] = useAddCustomerMutation();
  const [createOrder, {isLoading: isCreatingOrder}] = useCreateOrderMutation();
  const [createOrderAndInvoice, {isLoading: isCreatingOrderInvoice}] =
    useCreateOrderAndInvoiceMutation();

  const serviceChargeRate = useMemo(
    () => resolveServiceChargeRate(cart.deliveryType, posInit?.serviceCharge),
    [cart.deliveryType, posInit?.serviceCharge],
  );
  const amount = useMemo(
    () => computeCartAmount(cart.items, serviceChargeRate),
    [cart.items, serviceChargeRate],
  );

  const currency = resolveCurrencySymbol(posInit?.storeSettings?.currency);

  useEffect(() => {
    setUseInvoice(cart.billMode === 'invoice');
  }, [cart.billMode]);

  const selectSearchCustomer = (c: (typeof customers)[0]) => {
    dispatch(
      setSelectedCustomer({
        phone: c.phone,
        name: `${c.name} - (${c.phone})`,
      }),
    );
    setQuery('');
  };

  const onSubmit = async () => {
    if (!cart.items.length) {
      return;
    }
    if (cart.deliveryType === 'dinein' && !cart.tableId) {
      showToast('Table required for Dine-in.');
      return;
    }

    const orderInput = {
      items: cart.items,
      deliveryType: cart.deliveryType,
      selectedCustomer: cart.selectedCustomer,
      tableId: cart.tableId,
      selectedQrOrderItem: null as string | number | null,
      serviceCharge: posInit?.serviceCharge,
    };

    const paymentTitle =
      cart.paymentTypes?.find(
        pt => String(pt?.id) === String(cart.selectedPaymentType),
      )?.title ?? undefined;

    const itemsSnapshot = cart.items.map(line => ({ ...line }));
    const storeSettings = posInit?.storeSettings ?? {
      tenant_id: 0,
      store_image: null,
      store_name: null,
      address: null,
      phone: null,
      email: null,
      currency: null,
      is_qr_menu_enabled: false,
      unique_qr_code: null,
      is_qr_order_enabled: null,
      is_feedback_enabled: false,
      unique_id: null,
    };

    try {
      if (useInvoice) {
        const paymentId = cart.selectedPaymentType;
        const paymentRequired =
          cart.paymentTypes.length === 0 ||
          paymentId === null ||
          paymentId === '' ||
          typeof paymentId === 'undefined';

        if (paymentRequired) {
          showToast('Payment type required for Order + Invoice.');
          return;
        }

        const invoiceBody = buildCreateOrderAndInvoiceRequest({
          ...orderInput,
          selectedPaymentType: paymentId,
        });
        const res = await createOrderAndInvoice(invoiceBody).unwrap();

        const tokenNo = parseTokenNo(res);
        const orderId = parseOrderId(res.orderId);
        const invoiceId = parseOrderId(res.invoiceId);

        const printOutcome = await printOnOrderPlaced({
          printSettings: posInit?.printSettings,
          storeSettings,
          currency,
          items: itemsSnapshot,
          netTotal: amount.netTotal,
          taxTotal: amount.taxTotal,
          serviceChargeTotal: amount.serviceChargeTotal,
          total: amount.total,
          deliveryType: cart.deliveryType,
          tableTitle: cart.selectedTable?.table_title ?? null,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
          paymentMethod: paymentTitle,
          orderResponse: res,
          invoiceId,
        });

        setSuccessModal({
          tokenNo,
          orderId,
          invoiceId,
          total: amount.total,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
        });

        const skipReason = await getReceiptPrintSkipReason(posInit?.printSettings);
        const printErr = formatPrintSkippedMessage(printOutcome, skipReason);
        if (printErr) {
          showToast(`Order saved. ${printErr}`);
        } else if (wasReceiptPrinted(printOutcome)) {
          showToast('Order saved. Receipt printed.');
        }

        dispatch(
          addOrderHistoryItem({
            id: `inv-${orderId}-${Date.now()}`,
            tokenNo,
            orderId,
            invoiceId,
            total: amount.total,
            customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
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
          printSettings: posInit?.printSettings,
          storeSettings,
          currency,
          items: itemsSnapshot,
          netTotal: amount.netTotal,
          taxTotal: amount.taxTotal,
          serviceChargeTotal: amount.serviceChargeTotal,
          total: amount.total,
          deliveryType: cart.deliveryType,
          tableTitle: cart.selectedTable?.table_title ?? null,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
          paymentMethod: paymentTitle,
          orderResponse: res,
        });

        setSuccessModal({
          tokenNo,
          orderId,
          total: amount.total,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
        });

        const skipReason = await getReceiptPrintSkipReason(posInit?.printSettings);
        const printErr = formatPrintSkippedMessage(printOutcome, skipReason);
        if (printErr) {
          showToast(`Order saved. ${printErr}`);
        } else if (wasReceiptPrinted(printOutcome)) {
          showToast('Order saved. Receipt printed.');
        }

        dispatch(
          addOrderHistoryItem({
            id: `ord-${orderId}-${Date.now()}`,
            tokenNo,
            orderId,
            total: amount.total,
            customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
            createdAt: new Date().toISOString(),
            status: 'created',
            paymentMethod: paymentTitle,
          }),
        );
      }
      dispatch(clearCart());
    } catch (e: unknown) {
      const err = e as {data?: {code?: string; message?: string}};
      const msg =
        err?.data?.code === 'INVALID_OUTLET'
          ? 'Invalid outlet. Return to POS home, wait for the menu to load, then try again.'
          : (err?.data?.message ?? 'Unable to confirm order. Please try again.');
      showToast(msg);
    }
  };

  const onAddCustomer = async () => {
    await addCustomer({
      phone: customerForm.phone.replace(/\D/g, ''),
      phone_country_code: '91',
      name: customerForm.name,
      email: customerForm.email,
      birthDate: customerForm.birthDate,
      gender: customerForm.gender,
    }).unwrap();
    dispatch(
      setSelectedCustomer({
        phone: customerForm.phone,
        name: `${customerForm.name} - (${customerForm.phone})`,
      }),
    );
    setShowAddCustomer(false);
  };

  const isSubmitting = isCreatingOrder || isCreatingOrderInvoice;
  const searchActive = query.trim().length >= 1 && customers.length > 0;
  const tablet = isTablet();
  const contentMaxW = maxContentWidth();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Tablet: center checkout column for readable line length */}
        <View
          style={[
            styles.contentShell,
            tablet && {maxWidth: contentMaxW, alignSelf: 'center', width: '100%'},
          ]}>
        <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{
            top: scale(12),
            bottom: scale(12),
            left: scale(12),
            right: scale(12),
          }}>
          <ChevronLeftIcon size={moderateScale(22)} color={WARM} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topTitle}>Checkout</Text>
          <Text style={styles.topSub}>Review & confirm order</Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {toastMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <FlatList
        data={cart.items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.sectionLabel}>Customer</Text>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.fieldLabel}>Search by phone or name</Text>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Type to search…"
                placeholderTextColor={MUTED}
              />
              {searchActive && (
                <View style={styles.resultsBox}>
                  {customers.slice(0, 8).map(c => {
                    const selected =
                      cart.selectedCustomer?.phone === c.phone;
                    return (
                      <TouchableOpacity
                        key={`${c.phone}-${c.created_at}`}
                        style={[
                          styles.resultRow,
                          selected && styles.resultRowSelected,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => selectSearchCustomer(c)}>
                        <View style={styles.resultTextCol}>
                          <Text style={styles.resultName}>{c.name}</Text>
                          <Text style={styles.resultPhone}>{c.phone}</Text>
                        </View>
                        {selected ? (
                          <CheckIcon size={moderateScale(18)} color={ACCENT} strokeWidth={3} />
                        ) : (
                          <Text style={styles.resultTapHint}>Select</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {cart.selectedCustomer && (
                <View style={styles.selectedBanner}>
                  <View style={styles.selectedDot} />
                  <View style={{flex: 1}}>
                    <Text style={styles.selectedLabel}>Selected</Text>
                    <Text style={styles.selectedName} numberOfLines={2}>
                      {cart.selectedCustomer.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => dispatch(setSelectedCustomer(null))}>
                    <Text style={styles.clearSel}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles.addCustomerBtn}
                onPress={() => setShowAddCustomer(true)}
                activeOpacity={0.9}>
                <Text style={styles.addCustomerBtnText}>+ New customer</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Service type</Text>
            <View style={[styles.card, cardShadow]}>
              {/* Tablet: service pills in a row instead of stacked */}
              <View style={[styles.deliveryRow, tablet && styles.deliveryRowTablet]}>
                {DELIVERY_OPTIONS.map(opt => {
                  const active = cart.deliveryType === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.deliveryPill,
                        active && styles.deliveryPillActive,
                      ]}
                      onPress={() => dispatch(setDeliveryType(opt.key))}
                      activeOpacity={0.88}>
                      <Text
                        style={[
                          styles.deliveryPillTitle,
                          active && styles.deliveryPillTitleActive,
                        ]}>
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.deliveryPillHint,
                          active && styles.deliveryPillHintActive,
                        ]}>
                        {opt.hint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {cart.deliveryType === 'dinein' && !cart.tableId && (
                <Text style={styles.warnText}>
                  Choose a table from POS before submitting.
                </Text>
              )}
            </View>

            <Text style={styles.sectionLabel}>Bill type</Text>
            <View style={[styles.card, cardShadow, styles.billRow]}>
              <TouchableOpacity
                style={[styles.billPill, useInvoice && styles.billPillOn]}
                onPress={() => {
                  setUseInvoice(true);
                  dispatch(setBillMode('invoice'));
                }}>
                <Text
                  style={[styles.billPillText, useInvoice && styles.billPillTextOn]}>
                  Order + Invoice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billPill, !useInvoice && styles.billPillOn]}
                onPress={() => {
                  setUseInvoice(false);
                  dispatch(setBillMode('order'));
                }}>
                <Text
                  style={[
                    styles.billPillText,
                    !useInvoice && styles.billPillTextOn,
                  ]}>
                  Order only
                </Text>
              </TouchableOpacity>
            </View>

            {useInvoice && cart.paymentTypes.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Payment</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.payScroll}>
                  {cart.paymentTypes.map(pt => {
                    const on =
                      String(cart.selectedPaymentType) === String(pt.id);
                    return (
                      <TouchableOpacity
                        key={pt.id}
                        style={[styles.payChip, on && styles.payChipOn]}
                        onPress={() => dispatch(setPaymentType(pt.id))}>
                        <Text style={[styles.payChipText, on && styles.payChipTextOn]}>
                          {pt.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={styles.sectionLabel}>Your order</Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={[styles.cartLine, cardShadow]}>
            <View style={styles.cartLineTop}>
              <Text style={styles.lineTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  dispatch(
                    removeItem({ id: item.id, lineKey: item.lineKey }),
                  )
                }
                hitSlop={{
                  top: scale(8),
                  bottom: scale(8),
                  left: scale(8),
                  right: scale(8),
                }}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.linePrice}>
              {currency} {Number(item.net_price).toFixed(2)} each
            </Text>
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Qty</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    dispatch(
                      setItemQuantity({
                        id: item.id,
                        quantity: Math.max(0, item.quantity - 1),
                      }),
                    )
                  }>
                  <MinusIcon size={moderateScale(20)} color={WARM} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, styles.stepBtnPlus]}
                  onPress={() =>
                    dispatch(
                      setItemQuantity({
                        id: item.id,
                        quantity: item.quantity + 1,
                      }),
                    )
                  }>
                  <PlusIcon size={moderateScale(20)} color={WHITE} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.noteLabel}>Note for kitchen</Text>
            <TextInput
              style={styles.noteInput}
              value={item.notes ?? ''}
              onChangeText={t =>
                dispatch(setItemNotes({id: item.id, notes: t}))
              }
              placeholder="Optional — allergies, spice level…"
              placeholderTextColor={MUTED}
              multiline
            />
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.summary, cardShadow]}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.sumLine}>
              <Text style={styles.sumMuted}>Net</Text>
              <Text style={styles.sumVal}>
                {currency} {amount.netTotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sumLine}>
              <Text style={styles.sumMuted}>Tax</Text>
              <Text style={styles.sumVal}>
                {currency} {amount.taxTotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sumLine}>
              <Text style={styles.sumMuted}>Service</Text>
              <Text style={styles.sumVal}>
                {currency} {amount.serviceChargeTotal.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.sumLine, styles.sumTotalRow]}>
              <Text style={styles.sumTotalLabel}>Total</Text>
              <Text style={styles.sumTotalVal}>
                {currency} {amount.total.toFixed(2)}
              </Text>
            </View>
            <GradientButton
              title={isSubmitting ? 'Submitting…' : 'Confirm order'}
              onPress={onSubmit}
              loading={isSubmitting}
              disabled={!cart.items.length}
              showArrow
            />
          </View>
        }
      />
        </View>

      <Modal
        visible={showAddCustomer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCustomer(false)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            style={styles.modalBackdropFlex}
            activeOpacity={1}
            onPress={() => setShowAddCustomer(false)}
          />
          <View style={styles.addSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New customer</Text>
            <Text style={styles.sheetSub}>
              Details sync with your POS customer list.
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetForm}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.sheetInput}
                value={customerForm.name}
                onChangeText={v =>
                  setCustomerForm(s => ({...s, name: v}))
                }
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={MUTED}
              />
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.sheetInput}
                value={customerForm.phone}
                onChangeText={v =>
                  setCustomerForm(s => ({...s, phone: v}))
                }
                placeholder="+91 …"
                placeholderTextColor={MUTED}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.sheetInput}
                value={customerForm.email}
                onChangeText={v =>
                  setCustomerForm(s => ({...s, email: v}))
                }
                placeholder="name@email.com"
                placeholderTextColor={MUTED}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>Birth date</Text>
              <TextInput
                style={styles.sheetInput}
                value={customerForm.birthDate}
                onChangeText={v =>
                  setCustomerForm(s => ({...s, birthDate: v}))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MUTED}
              />
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(
                  [
                    {k: 'male', l: 'Male'},
                    {k: 'female', l: 'Female'},
                    {k: 'other', l: 'Other'},
                  ] as const
                ).map(g => (
                  <TouchableOpacity
                    key={g.k}
                    style={[
                      styles.genderChip,
                      customerForm.gender === g.k && styles.genderChipOn,
                    ]}
                    onPress={() =>
                      setCustomerForm(s => ({...s, gender: g.k}))
                    }>
                    <Text
                      style={[
                        styles.genderChipText,
                        customerForm.gender === g.k && styles.genderChipTextOn,
                      ]}>
                      {g.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.sheetPrimary, isAddingCustomer && {opacity: 0.6}]}
              disabled={isAddingCustomer}
              onPress={onAddCustomer}>
              <Text style={styles.sheetPrimaryText}>
                {isAddingCustomer ? 'Saving…' : 'Save & select'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowAddCustomer(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!successModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal(null)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successKicker}>Order confirmed</Text>
            {successModal ? (
              <>
                <Text style={styles.successToken}>Token #{successModal.tokenNo}</Text>
                <Text style={styles.successMeta}>
                  Order ID: {successModal.orderId}
                </Text>
                {successModal.invoiceId != null ? (
                  <Text style={styles.successMeta}>
                    Invoice: {successModal.invoiceId}
                  </Text>
                ) : null}
                <Text style={styles.successTotal}>
                  Total {currency} {successModal.total.toFixed(2)}
                </Text>
                <Text style={styles.successCustomer} numberOfLines={2}>
                  {successModal.customerName}
                </Text>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.successPrimary}
              onPress={() => {
                setSuccessModal(null);
                navigation.goBack();
              }}>
              <Text style={styles.successPrimaryText}>New order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondary}
              onPress={() => {
                setSuccessModal(null);
                const parent: any = (navigation as any).getParent?.();
                parent?.navigate?.('Orders', {screen: 'OrdersMain'});
              }}>
              <Text style={styles.successSecondaryText}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},
  contentShell: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
  },
  backBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtnText: {fontSize: moderateScale(22), color: WARM, fontWeight: '700'},
  backBtnPlaceholder: {width: scale(44)},
  topBarCenter: {flex: 1, alignItems: 'center'},
  topTitle: {fontSize: moderateScale(18), fontWeight: '800', color: WARM},
  topSub: {fontSize: moderateScale(12), color: MUTED, marginTop: verticalScale(2)},
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(32),
    flexGrow: 1,
  },
  sectionLabel: {
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: MUTED,
    marginBottom: verticalScale(8),
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: WARM,
    backgroundColor: BG,
  },
  resultsBox: {
    marginTop: verticalScale(10),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: '#E8DFD2',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8DFD2',
    backgroundColor: WHITE,
  },
  resultRowSelected: {backgroundColor: 'rgba(255,159,90,0.12)'},
  resultTextCol: {flex: 1, flexShrink: 1},
  resultName: {fontSize: moderateScale(16), fontWeight: '700', color: WARM},
  resultPhone: {fontSize: moderateScale(13), color: MUTED, marginTop: verticalScale(2)},
  resultTapHint: {fontSize: moderateScale(13), fontWeight: '600', color: ACCENT},
  resultCheck: {fontSize: moderateScale(18), fontWeight: '800', color: ACCENT},
  selectedBanner: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHARCOAL,
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
  },
  selectedDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: ACCENT,
    marginRight: scale(10),
  },
  selectedLabel: {fontSize: moderateScale(11), color: 'rgba(255,255,255,0.6)', fontWeight: '600'},
  selectedName: {fontSize: moderateScale(15), color: WHITE, fontWeight: '700', marginTop: verticalScale(2), flexShrink: 1},
  clearSel: {fontSize: moderateScale(14), fontWeight: '700', color: ACCENT},
  addCustomerBtn: {
    marginTop: verticalScale(14),
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(12),
    alignItems: 'center',
  },
  addCustomerBtnText: {color: ACCENT, fontWeight: '800', fontSize: moderateScale(15)},
  deliveryRow: {gap: scale(10)},
  deliveryRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deliveryPill: {
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    backgroundColor: BG,
    flex: 1,
    flexShrink: 1,
    minWidth: scale(100),
  },
  deliveryPillActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  deliveryPillTitle: {fontSize: moderateScale(16), fontWeight: '800', color: WARM},
  deliveryPillTitleActive: {color: CHARCOAL},
  deliveryPillHint: {fontSize: moderateScale(12), color: MUTED, marginTop: verticalScale(4)},
  deliveryPillHintActive: {color: MUTED},
  warnText: {marginTop: verticalScale(10), fontSize: moderateScale(13), color: '#b00020', fontWeight: '600'},
  billRow: {flexDirection: 'row', gap: scale(10)},
  billPill: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  billPillOn: {backgroundColor: ACCENT, borderColor: ACCENT},
  billPillText: {fontSize: moderateScale(14), fontWeight: '700', color: MUTED},
  billPillTextOn: {color: WHITE},
  payScroll: {gap: scale(10), paddingVertical: verticalScale(4)},
  payChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  payChipOn: {borderColor: ACCENT, backgroundColor: 'rgba(255,159,90,0.12)'},
  payChipText: {fontWeight: '700', color: WARM, fontSize: moderateScale(14)},
  payChipTextOn: {color: CHARCOAL},
  cartLine: {
    backgroundColor: WHITE,
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    marginBottom: verticalScale(12),
  },
  cartLineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: scale(8),
  },
  lineTitle: {flex: 1, flexShrink: 1, fontSize: moderateScale(16), fontWeight: '800', color: WARM},
  removeLink: {fontSize: moderateScale(14), fontWeight: '700', color: '#c62828'},
  linePrice: {marginTop: verticalScale(6), fontSize: moderateScale(13), color: MUTED},
  qtyRow: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyLabel: {fontSize: moderateScale(14), fontWeight: '700', color: MUTED},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: scale(12)},
  stepBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(18),
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  stepBtnPlus: {backgroundColor: ACCENT, borderColor: ACCENT},
  stepBtnText: {fontSize: moderateScale(20), fontWeight: '700', color: WARM},
  stepBtnTextLight: {fontSize: moderateScale(20), fontWeight: '700', color: WHITE},
  stepVal: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: WARM,
    minWidth: scale(24),
    textAlign: 'center',
  },
  noteLabel: {marginTop: verticalScale(12), fontSize: moderateScale(13), fontWeight: '600', color: MUTED},
  noteInput: {
    marginTop: verticalScale(6),
    minHeight: verticalScale(64),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    color: WARM,
    textAlignVertical: 'top',
    backgroundColor: BG,
  },
  summary: {
    marginTop: verticalScale(8),
    backgroundColor: CHARCOAL,
    borderRadius: moderateScale(22),
    padding: moderateScale(20),
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: moderateScale(12),
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: verticalScale(12),
  },
  sumLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  sumMuted: {color: 'rgba(255,255,255,0.65)', fontSize: moderateScale(15)},
  sumVal: {color: WHITE, fontSize: moderateScale(15), fontWeight: '600'},
  sumTotalRow: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  sumTotalLabel: {color: WHITE, fontSize: moderateScale(18), fontWeight: '800'},
  sumTotalVal: {color: ACCENT, fontSize: moderateScale(20), fontWeight: '800'},
  confirmBtn: {
    marginTop: verticalScale(18),
    backgroundColor: ACCENT,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  confirmBtnText: {color: WHITE, fontSize: moderateScale(17), fontWeight: '800'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalBackdropFlex: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)'},
  addSheet: {
    backgroundColor: BG,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(24),
    maxHeight: '88%',
    alignSelf: 'center',
    width: '100%',
    maxWidth: scale(560),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: '#D4C9BC',
    marginBottom: verticalScale(16),
  },
  sheetTitle: {fontSize: moderateScale(22), fontWeight: '800', color: WARM},
  sheetSub: {marginTop: verticalScale(6), fontSize: moderateScale(14), color: MUTED, lineHeight: verticalScale(20)},
  sheetForm: {paddingBottom: verticalScale(16)},
  sheetInput: {
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: WARM,
    backgroundColor: WHITE,
    marginBottom: verticalScale(14),
  },
  genderRow: {flexDirection: 'row', gap: scale(8), flexWrap: 'wrap', marginBottom: verticalScale(8)},
  genderChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  genderChipOn: {borderColor: ACCENT, backgroundColor: 'rgba(255,159,90,0.15)'},
  genderChipText: {fontWeight: '600', color: MUTED, fontSize: moderateScale(14)},
  genderChipTextOn: {color: WARM, fontWeight: '800'},
  sheetPrimary: {
    backgroundColor: ACCENT,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  sheetPrimaryText: {color: WHITE, fontSize: moderateScale(17), fontWeight: '800'},
  sheetCancel: {marginTop: verticalScale(12), paddingVertical: verticalScale(10), alignItems: 'center'},
  sheetCancelText: {color: MUTED, fontWeight: '600', fontSize: moderateScale(15)},
  toast: {
    position: 'absolute',
    top: verticalScale(56),
    left: scale(16),
    right: scale(16),
    backgroundColor: CHARCOAL,
    padding: moderateScale(12),
    borderRadius: moderateScale(14),
    zIndex: 999,
  },
  toastText: {color: WHITE, fontWeight: '800', fontSize: moderateScale(13), lineHeight: verticalScale(18)},
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: moderateScale(16),
  },
  successCard: {
    backgroundColor: '#fff8f1',
    borderRadius: moderateScale(26),
    padding: moderateScale(22),
    width: '100%',
    maxWidth: scale(400),
    alignSelf: 'center',
  },
  successKicker: {color: MUTED, fontWeight: '800', fontSize: moderateScale(12), letterSpacing: 0.7},
  successToken: {marginTop: verticalScale(10), fontSize: moderateScale(36), fontWeight: '900', color: WARM},
  successMeta: {marginTop: verticalScale(6), fontSize: moderateScale(14), fontWeight: '700', color: MUTED},
  successTotal: {marginTop: verticalScale(14), fontSize: moderateScale(22), fontWeight: '900', color: WARM},
  successCustomer: {marginTop: verticalScale(8), fontSize: moderateScale(14), fontWeight: '700', color: MUTED},
  successPrimary: {
    marginTop: verticalScale(18),
    backgroundColor: ACCENT,
    borderRadius: moderateScale(18),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
  },
  successPrimaryText: {color: WHITE, fontWeight: '900', fontSize: moderateScale(16)},
  successSecondary: {
    marginTop: verticalScale(12),
    backgroundColor: 'transparent',
    borderRadius: moderateScale(18),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  successSecondaryText: {color: WARM, fontWeight: '900', fontSize: moderateScale(16)},
});
