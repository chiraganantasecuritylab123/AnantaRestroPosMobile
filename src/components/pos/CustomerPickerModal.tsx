import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  useAddCustomerMutation,
  useSearchCustomersQuery,
} from '../../services/customerApi';
import type {CustomerRef} from '../../features/cartSlice';
import {
  CheckIcon,
  ChevronLeftIcon,
  PhoneCountryInput,
  PlusIcon,
  SearchIcon,
  UserIcon,
  CloseIcon,
} from '../ui';
import {cardShadow, colors, radii, spacing} from '../../theme';
import {
  DEFAULT_COUNTRY,
  buildAuthPhone,
  formatCustomerPhone,
  getPhoneCountryCode,
  type CountryDialOption,
} from '../../utils/countryDialCodes';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

const HIT_SLOP = {
  top: scale(8),
  bottom: scale(8),
  left: scale(8),
  right: scale(8),
};
const AVATAR_SIZE = scale(44);
const HEADER_BTN_SIZE = scale(40);

type Props = {
  visible: boolean;
  selected: CustomerRef | null;
  onSelect: (customer: CustomerRef | null) => void;
  onClose: () => void;
};

const GENDERS = [
  {k: 'male' as const, label: 'Male'},
  {k: 'female' as const, label: 'Female'},
  {k: 'other' as const, label: 'Other'},
];

function customerDisplayParts(customer: CustomerRef) {
  const phone = customer.phone?.trim() ?? '';
  const name =
    customer.name.replace(/\s*-\s*\([^)]+\)\s*$/, '').trim() ||
    customer.name;
  return {name, phone};
}

function customerInitial(name: string) {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

export const CustomerPickerModal: React.FC<Props> = ({
  visible,
  selected,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [country, setCountry] = useState<CountryDialOption>(DEFAULT_COUNTRY);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    email: '',
    birthDate: '1990-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
  });

  const {data: customers = [], isFetching} = useSearchCustomersQuery(query, {
    skip: query.trim().length < 1,
  });
  const [addCustomer, {isLoading: adding}] = useAddCustomerMutation();

  const selectedParts = useMemo(
    () => (selected ? customerDisplayParts(selected) : null),
    [selected],
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setMode('list');
      setCountry(DEFAULT_COUNTRY);
    }
  }, [visible]);

  const selectCustomer = (c: (typeof customers)[0]) => {
    onSelect({phone: c.phone, name: `${c.name} - (${c.phone})`});
    setQuery('');
    onClose();
  };

  const onSaveNew = async () => {
    if (!canSaveNew) {
      return;
    }
    const phoneSaved = formatCustomerPhone(country, form.phone);
    const phoneNational = buildAuthPhone(country, form.phone);
    const phoneCountryCode = getPhoneCountryCode(country);
    await addCustomer({
      phone: phoneNational,
      phone_country_code: phoneCountryCode,
      name: form.name.trim(),
      email: form.email,
      birthDate: form.birthDate,
      gender: form.gender,
    }).unwrap();
    onSelect({
      phone: phoneSaved,
      name: `${form.name.trim()} - (${phoneSaved})`,
    });
    setMode('list');
    setCountry(DEFAULT_COUNTRY);
    setForm({
      phone: '',
      name: '',
      email: '',
      birthDate: '1990-01-01',
      gender: 'male',
    });
    onClose();
  };

  const phoneDigits = form.phone.replace(/\D/g, '');
  const canSaveNew =
    phoneDigits.length === country.nationalLength &&
    form.name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {mode === 'add' ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setMode('list')}
              hitSlop={HIT_SLOP}
              accessibilityLabel="Back to customer list">
              <ChevronLeftIcon size={moderateScale(22)} color={colors.navy} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSideSpacer} />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.kicker}>
              {mode === 'list' ? 'Order' : 'New'}
            </Text>
            <Text style={styles.title}>
              {mode === 'list' ? 'Select customer' : 'Add customer'}
            </Text>
            {mode === 'list' ? (
              <Text style={styles.subtitle}>Search by name or phone</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onClose}
            hitSlop={HIT_SLOP}
            accessibilityLabel="Close">
            <CloseIcon size={moderateScale(20)} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {mode === 'list' ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <SearchIcon size={moderateScale(20)} color={colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Phone or customer name"
                  placeholderTextColor={colors.mutedLight}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setQuery('')}
                    hitSlop={HIT_SLOP}
                    accessibilityLabel="Clear search">
                    <CloseIcon size={moderateScale(16)} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {selectedParts ? (
              <View style={[styles.selectedCard, cardShadow]}>
                <View style={styles.selectedAvatar}>
                  <Text style={styles.selectedAvatarText}>
                    {customerInitial(selectedParts.name)}
                  </Text>
                </View>
                <View style={styles.selectedBody}>
                  <Text style={styles.selectedLabel}>Current selection</Text>
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {selectedParts.name}
                  </Text>
                  {selectedParts.phone ? (
                    <Text style={styles.selectedPhone}>{selectedParts.phone}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                  hitSlop={HIT_SLOP}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.addCustomerCard}
              onPress={() => setMode('add')}
              activeOpacity={0.88}>
              <View style={styles.addCustomerIcon}>
                <PlusIcon
                  size={moderateScale(18)}
                  color={colors.green}
                  strokeWidth={2.5}
                />
              </View>
              <View style={styles.addCustomerTextWrap}>
                <Text style={styles.addCustomerTitle}>Add new customer</Text>
                <Text style={styles.addCustomerHint}>
                  Create and attach to this order
                </Text>
              </View>
              <Text style={styles.addCustomerChevron}>›</Text>
            </TouchableOpacity>

            {isFetching && query.trim() ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.green} />
                <Text style={styles.loadingText}>Searching…</Text>
              </View>
            ) : null}

            <FlatList
              data={query.trim() ? customers : []}
              keyExtractor={item => `${item.phone}-${item.created_at}`}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIconCircle}>
                    <UserIcon size={moderateScale(26)} color={colors.muted} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {query.trim() ? 'No customers found' : 'Search customers'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {query.trim()
                      ? 'Try another phone number or spelling.'
                      : 'Enter at least one character to find existing customers.'}
                  </Text>
                </View>
              }
              renderItem={({item}) => {
                const isSel = selected?.phone === item.phone;
                return (
                  <TouchableOpacity
                    style={[
                      styles.row,
                      cardShadow,
                      isSel && styles.rowSelected,
                    ]}
                    onPress={() => selectCustomer(item)}
                    activeOpacity={0.88}>
                    <View
                      style={[
                        styles.avatar,
                        isSel && styles.avatarSelected,
                      ]}>
                      <Text
                        style={[
                          styles.avatarText,
                          isSel && styles.avatarTextSelected,
                        ]}>
                        {customerInitial(item.name)}
                      </Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowPhone}>{item.phone}</Text>
                    </View>
                    {isSel ? (
                      <View style={styles.checkBadge}>
                        <CheckIcon
                          size={moderateScale(14)}
                          color={colors.white}
                          strokeWidth={3}
                        />
                      </View>
                    ) : (
                      <Text style={styles.rowChevron}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </KeyboardAvoidingView>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={[styles.formCard, cardShadow]}>
                <Text style={styles.formIntro}>
                  Details are saved and linked to this order.
                </Text>

                <Field
                  label="Full name"
                  value={form.name}
                  onChangeText={v => setForm(s => ({...s, name: v}))}
                  placeholder="Customer name"
                />
                <PhoneCountryInput
                  label="Phone"
                  labelStyle={styles.fieldLabel}
                  country={country}
                  onCountryChange={setCountry}
                  phone={form.phone}
                  onPhoneChange={digits =>
                    setForm(s => ({...s, phone: digits}))
                  }
                  placeholder="10-digit mobile"
                />
                <View style={{marginTop: verticalScale(15)}}/>
                <Field
                  label="Email (optional)"
                  value={form.email}
                  onChangeText={v => setForm(s => ({...s, email: v}))}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {GENDERS.map(g => {
                    const active = form.gender === g.k;
                    return (
                      <TouchableOpacity
                        key={g.k}
                        style={[
                          styles.genderChip,
                          active && styles.genderChipOn,
                        ]}
                        onPress={() => setForm(s => ({...s, gender: g.k}))}
                        activeOpacity={0.85}>
                        <Text
                          style={[
                            styles.genderText,
                            active && styles.genderTextOn,
                          ]}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.formFooter}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!canSaveNew || adding) && styles.saveBtnDisabled,
                ]}
                disabled={!canSaveNew || adding}
                onPress={onSaveNew}
                activeOpacity={0.88}>
                {adding ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save & select</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  safe: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerSideSpacer: {width: HEADER_BTN_SIZE},
  headerIconBtn: {
    width: HEADER_BTN_SIZE,
    height: HEADER_BTN_SIZE,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 0,
  },
  kicker: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
    marginTop: verticalScale(2),
  },
  subtitle: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    fontWeight: '500',
  },
  searchCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: colors.navy,
    minWidth: 0,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.md,
  },
  selectedAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedAvatarText: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.greenDark,
  },
  selectedBody: {flex: 1, minWidth: 0},
  selectedLabel: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  selectedName: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: colors.navy,
    marginTop: verticalScale(2),
  },
  selectedPhone: {
    fontSize: moderateScale(13),
    color: colors.muted,
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  removeBtn: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(10),
    borderRadius: radii.md,
    backgroundColor: colors.errorBg,
    flexShrink: 0,
  },
  removeBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.error,
  },
  addCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.md,
  },
  addCustomerIcon: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addCustomerTextWrap: {flex: 1, minWidth: 0},
  addCustomerTitle: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: colors.navy,
  },
  addCustomerHint: {
    fontSize: moderateScale(12),
    color: colors.muted,
    marginTop: verticalScale(2),
  },
  addCustomerChevron: {
    fontSize: moderateScale(22),
    color: colors.mutedLight,
    fontWeight: '600',
    flexShrink: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadingText: {
    fontSize: moderateScale(13),
    color: colors.muted,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: colors.green,
    backgroundColor: '#F0FDF4',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSelected: {
    backgroundColor: colors.green,
  },
  avatarText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
  },
  avatarTextSelected: {color: colors.white},
  rowBody: {flex: 1, minWidth: 0},
  rowName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
  },
  rowPhone: {
    fontSize: moderateScale(13),
    color: colors.muted,
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  checkBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowChevron: {
    fontSize: moderateScale(20),
    color: colors.mutedLight,
    fontWeight: '600',
    flexShrink: 0,
  },
  formScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formIntro: {
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: verticalScale(18),
    marginBottom: spacing.lg,
  },
  field: {marginBottom: spacing.lg},
  fieldLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: colors.navy,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderChip: {
    flex: 1,
    paddingVertical: verticalScale(11),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
    minWidth: 0,
  },
  genderChipOn: {
    borderColor: colors.green,
    backgroundColor: '#ECFDF5',
  },
  genderText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
  },
  genderTextOn: {
    color: colors.greenDark,
    fontWeight: '800',
  },
  formFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    ...cardShadow,
  },
  saveBtn: {
    backgroundColor: colors.green,
    paddingVertical: verticalScale(15),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(52),
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: moderateScale(16),
  },
});
