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
import {
  clearCart,
  removeItem,
  setDeliveryType,
  setItemNotes,
  setItemQuantity,
  setPaymentType,
  setSelectedCustomer,
} from '../features/cartSlice';
import type {DeliveryType} from '../features/cartSlice';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {
  useCreateOrderAndInvoiceMutation,
  useCreateOrderMutation,
} from '../services/orderApi';
import {addOrderHistoryItem} from '../features/orderHistorySlice';
import type {PosStackParamList} from '../navigation/types';
import {GradientButton, ScreenBackground} from '../components/ui';
import {cardShadow, colors} from '../theme';

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
  const [useInvoice, setUseInvoice] = useState(true);
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

  const {data: customers = []} = useSearchCustomersQuery(query, {
    skip: query.trim().length < 1,
  });
  const [addCustomer, {isLoading: isAddingCustomer}] = useAddCustomerMutation();
  const [createOrder, {isLoading: isCreatingOrder}] = useCreateOrderMutation();
  const [createOrderAndInvoice, {isLoading: isCreatingOrderInvoice}] =
    useCreateOrderAndInvoiceMutation();

  const amount = useMemo(() => {
    const netTotal = cart.items.reduce(
      (sum, i) => sum + Number(i.net_price) * i.quantity,
      0,
    );
    const taxTotal = cart.items.reduce((sum, i) => {
      const raw = Number(i.net_price) * i.quantity;
      return sum + raw * (Number(i.tax_rate) / 100);
    }, 0);
    const serviceChargeTotal = netTotal * 0.1;
    const total = netTotal + taxTotal + serviceChargeTotal;
    return {netTotal, taxTotal, serviceChargeTotal, total};
  }, [cart.items]);

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

    const basePayload = {
      cart: cart.items,
      deliveryType: cart.deliveryType,
      customerType: 'CUSTOMER',
      customerId: cart.selectedCustomer,
      tableId: cart.tableId ?? '',
      selectedQrOrderItem: null,
    };

    const paymentTitle =
      cart.paymentTypes?.find(
        pt => String(pt?.id) === String(cart.selectedPaymentType),
      )?.title ?? undefined;

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

        const res = await createOrderAndInvoice({
          ...basePayload,
          ...amount,
          selectedPaymentType: cart.selectedPaymentType ?? '',
        }).unwrap();

        setSuccessModal({
          tokenNo: res.tokenNo,
          orderId: res.orderId,
          invoiceId: res.invoiceId,
          total: amount.total,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
        });

        dispatch(
          addOrderHistoryItem({
            id: `inv-${res.orderId}-${Date.now()}`,
            tokenNo: res.tokenNo,
            orderId: res.orderId,
            invoiceId: res.invoiceId,
            total: amount.total,
            customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
            createdAt: new Date().toISOString(),
            status: 'created',
            paymentMethod: paymentTitle,
          }),
        );
      } else {
        const res = await createOrder(basePayload).unwrap();

        setSuccessModal({
          tokenNo: res.tokenNo,
          orderId: res.orderId,
          total: amount.total,
          customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
        });

        dispatch(
          addOrderHistoryItem({
            id: `ord-${res.orderId}-${Date.now()}`,
            tokenNo: res.tokenNo,
            orderId: res.orderId,
            total: amount.total,
            customerName: cart.selectedCustomer?.name ?? 'Walk-in customer',
            createdAt: new Date().toISOString(),
            status: 'created',
            paymentMethod: paymentTitle,
          }),
        );
      }
      dispatch(clearCart());
    } catch {
      showToast('Unable to confirm order. Please try again.');
    }
  };

  const onAddCustomer = async () => {
    await addCustomer({
      phone: customerForm.phone,
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

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backBtnText}>←</Text>
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
                          <Text style={styles.resultCheck}>✓</Text>
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
              <View style={styles.deliveryRow}>
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
                onPress={() => setUseInvoice(true)}>
                <Text
                  style={[styles.billPillText, useInvoice && styles.billPillTextOn]}>
                  Order + Invoice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billPill, !useInvoice && styles.billPillOn]}
                onPress={() => setUseInvoice(false)}>
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
                onPress={() => dispatch(removeItem(item.id))}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.linePrice}>
              ${Number(item.net_price).toFixed(2)} each
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
                  <Text style={styles.stepBtnText}>−</Text>
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
                  <Text style={styles.stepBtnTextLight}>+</Text>
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
              <Text style={styles.sumVal}>${amount.netTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.sumLine}>
              <Text style={styles.sumMuted}>Tax</Text>
              <Text style={styles.sumVal}>${amount.taxTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.sumLine}>
              <Text style={styles.sumMuted}>Service</Text>
              <Text style={styles.sumVal}>
                ${amount.serviceChargeTotal.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.sumLine, styles.sumTotalRow]}>
              <Text style={styles.sumTotalLabel}>Total</Text>
              <Text style={styles.sumTotalVal}>${amount.total.toFixed(2)}</Text>
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
                  Total ${successModal.total.toFixed(2)}
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
                parent?.navigate?.('Orders');
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtnText: {fontSize: 22, color: WARM, fontWeight: '700'},
  backBtnPlaceholder: {width: 44},
  topBarCenter: {flex: 1, alignItems: 'center'},
  topTitle: {fontSize: 18, fontWeight: '800', color: WARM},
  topSub: {fontSize: 12, color: MUTED, marginTop: 2},
  listContent: {paddingHorizontal: 16, paddingBottom: 32},
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: WARM,
    backgroundColor: BG,
  },
  resultsBox: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DFD2',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8DFD2',
    backgroundColor: WHITE,
  },
  resultRowSelected: {backgroundColor: 'rgba(255,159,90,0.12)'},
  resultTextCol: {flex: 1},
  resultName: {fontSize: 16, fontWeight: '700', color: WARM},
  resultPhone: {fontSize: 13, color: MUTED, marginTop: 2},
  resultTapHint: {fontSize: 13, fontWeight: '600', color: ACCENT},
  resultCheck: {fontSize: 18, fontWeight: '800', color: ACCENT},
  selectedBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHARCOAL,
    borderRadius: 14,
    padding: 12,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 10,
  },
  selectedLabel: {fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600'},
  selectedName: {fontSize: 15, color: WHITE, fontWeight: '700', marginTop: 2},
  clearSel: {fontSize: 14, fontWeight: '700', color: ACCENT},
  addCustomerBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addCustomerBtnText: {color: ACCENT, fontWeight: '800', fontSize: 15},
  deliveryRow: {gap: 10},
  deliveryPill: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: BG,
  },
  deliveryPillActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  deliveryPillTitle: {fontSize: 16, fontWeight: '800', color: WARM},
  deliveryPillTitleActive: {color: CHARCOAL},
  deliveryPillHint: {fontSize: 12, color: MUTED, marginTop: 4},
  deliveryPillHintActive: {color: MUTED},
  warnText: {marginTop: 10, fontSize: 13, color: '#b00020', fontWeight: '600'},
  billRow: {flexDirection: 'row', gap: 10},
  billPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  billPillOn: {backgroundColor: ACCENT, borderColor: ACCENT},
  billPillText: {fontSize: 14, fontWeight: '700', color: MUTED},
  billPillTextOn: {color: WHITE},
  payScroll: {gap: 10, paddingVertical: 4},
  payChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  payChipOn: {borderColor: ACCENT, backgroundColor: 'rgba(255,159,90,0.12)'},
  payChipText: {fontWeight: '700', color: WARM},
  payChipTextOn: {color: CHARCOAL},
  cartLine: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cartLineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  lineTitle: {flex: 1, fontSize: 16, fontWeight: '800', color: WARM},
  removeLink: {fontSize: 14, fontWeight: '700', color: '#c62828'},
  linePrice: {marginTop: 6, fontSize: 13, color: MUTED},
  qtyRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyLabel: {fontSize: 14, fontWeight: '700', color: MUTED},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  stepBtnPlus: {backgroundColor: ACCENT, borderColor: ACCENT},
  stepBtnText: {fontSize: 20, fontWeight: '700', color: WARM},
  stepBtnTextLight: {fontSize: 20, fontWeight: '700', color: WHITE},
  stepVal: {fontSize: 17, fontWeight: '800', color: WARM, minWidth: 24, textAlign: 'center'},
  noteLabel: {marginTop: 12, fontSize: 13, fontWeight: '600', color: MUTED},
  noteInput: {
    marginTop: 6,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WARM,
    textAlignVertical: 'top',
    backgroundColor: BG,
  },
  summary: {
    marginTop: 8,
    backgroundColor: CHARCOAL,
    borderRadius: 22,
    padding: 20,
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sumLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sumMuted: {color: 'rgba(255,255,255,0.65)', fontSize: 15},
  sumVal: {color: WHITE, fontSize: 15, fontWeight: '600'},
  sumTotalRow: {marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)'},
  sumTotalLabel: {color: WHITE, fontSize: 18, fontWeight: '800'},
  sumTotalVal: {color: ACCENT, fontSize: 20, fontWeight: '800'},
  confirmBtn: {
    marginTop: 18,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: {color: WHITE, fontSize: 17, fontWeight: '800'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalBackdropFlex: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)'},
  addSheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4C9BC',
    marginBottom: 16,
  },
  sheetTitle: {fontSize: 22, fontWeight: '800', color: WARM},
  sheetSub: {marginTop: 6, fontSize: 14, color: MUTED, lineHeight: 20},
  sheetForm: {paddingBottom: 16},
  sheetInput: {
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: WARM,
    backgroundColor: WHITE,
    marginBottom: 14,
  },
  genderRow: {flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8},
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  genderChipOn: {borderColor: ACCENT, backgroundColor: 'rgba(255,159,90,0.15)'},
  genderChipText: {fontWeight: '600', color: MUTED},
  genderChipTextOn: {color: WARM, fontWeight: '800'},
  sheetPrimary: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetPrimaryText: {color: WHITE, fontSize: 17, fontWeight: '800'},
  sheetCancel: {marginTop: 12, paddingVertical: 10, alignItems: 'center'},
  sheetCancelText: {color: MUTED, fontWeight: '600', fontSize: 15},
  toast: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: CHARCOAL,
    padding: 12,
    borderRadius: 14,
    zIndex: 999,
  },
  toastText: {color: WHITE, fontWeight: '800', fontSize: 13, lineHeight: 18},
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  successCard: {
    backgroundColor: '#fff8f1',
    borderRadius: 26,
    padding: 22,
  },
  successKicker: {color: MUTED, fontWeight: '800', fontSize: 12, letterSpacing: 0.7},
  successToken: {marginTop: 10, fontSize: 36, fontWeight: '900', color: WARM},
  successMeta: {marginTop: 6, fontSize: 14, fontWeight: '700', color: MUTED},
  successTotal: {marginTop: 14, fontSize: 22, fontWeight: '900', color: WARM},
  successCustomer: {marginTop: 8, fontSize: 14, fontWeight: '700', color: MUTED},
  successPrimary: {
    marginTop: 18,
    backgroundColor: ACCENT,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successPrimaryText: {color: WHITE, fontWeight: '900', fontSize: 16},
  successSecondary: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DFD2',
  },
  successSecondaryText: {color: WARM, fontWeight: '900', fontSize: 16},
});
