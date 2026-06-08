import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useAddCustomerMutation,
  useSearchCustomersQuery,
  type CustomerSearchItem,
} from '../services/customerApi';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {
  Card,
  CloseIcon,
  SearchIcon,
  TopHeader,
  TopHeaderAction,
  UserIcon,
} from '../components/ui';
import {cardShadow, colors, radii, spacing} from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Customers'>;

const GENDERS = [
  {key: 'male' as const, label: 'Male'},
  {key: 'female' as const, label: 'Female'},
  {key: 'other' as const, label: 'Other'},
];

function customerInitial(name: string) {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

export const CustomersScreen: React.FC<Props> = ({navigation, route}) => {
  const [query, setQuery] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    email: '',
    birthDate: '1990-01-01',
    gender: 'male' as 'male' | 'female' | 'other',
  });

  const trimmedQuery = query.trim();
  const {data: customers = [], isFetching} = useSearchCustomersQuery(
    trimmedQuery,
    {skip: trimmedQuery.length < 1},
  );
  const [addCustomer, {isLoading: adding}] = useAddCustomerMutation();

  const canSaveNew =
    form.phone.trim().length > 0 && form.name.trim().length > 0;

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.searchRow}>
          <SearchIcon size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by phone or name"
            placeholderTextColor={colors.mutedLight}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search">
              <CloseIcon size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {isFetching && trimmedQuery ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.green} size="small" />
            <Text style={styles.loadingText}>Searching…</Text>
          </View>
        ) : null}
      </View>
    ),
    [isFetching, query, trimmedQuery],
  );

  const resetForm = () => {
    setForm({
      phone: '',
      name: '',
      email: '',
      birthDate: '1990-01-01',
      gender: 'male',
    });
  };

  const onSaveNew = async () => {
    if (!canSaveNew) {
      return;
    }
    try {
      const phoneSaved = form.phone.trim();
      const res = await addCustomer({
        phone: phoneSaved,
        name: form.name.trim(),
        email: form.email.trim(),
        birthDate: form.birthDate,
        gender: form.gender,
      }).unwrap();
      setAddVisible(false);
      resetForm();
      setQuery(phoneSaved);
      Alert.alert('Customer added', res.message ?? 'Customer saved.');
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}; error?: string};
      Alert.alert(
        'Could not save',
        err?.data?.message ?? err?.error ?? 'Please try again.',
      );
    }
  };

  const renderCustomer = ({item}: {item: CustomerSearchItem}) => (
    <Card style={styles.rowCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{customerInitial(item.name)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowPhone}>{item.phone}</Text>
        {item.email ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.email}
          </Text>
        ) : null}
        {item.is_member ? (
          <Text style={styles.memberBadge}>Member</Text>
        ) : null}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopHeader
        title="Customers"
        onBack={() =>
          handleProfileStackBack(navigation, route.params?.fromSideMenu)
        }
        right={
          <TopHeaderAction label="Add" onPress={() => setAddVisible(true)} />
        }
      />

      <FlatList
        data={trimmedQuery ? customers : []}
        keyExtractor={item => `${item.phone}-${item.created_at}`}
        renderItem={renderCustomer}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <UserIcon size={28} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {trimmedQuery ? 'No customers found' : 'Search customers'}
            </Text>
            <Text style={styles.emptyText}>
              {trimmedQuery
                ? 'Try another phone number or spelling.'
                : 'Enter a phone number or name to find customers.'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={addVisible}
        animationType="slide"
        onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setAddVisible(false);
                resetForm();
              }}
              hitSlop={8}>
              <CloseIcon size={22} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add customer</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={[styles.formCard, cardShadow]}>
                <FormField
                  label="Full name"
                  value={form.name}
                  onChangeText={v => setForm(s => ({...s, name: v}))}
                  placeholder="Customer name"
                />
                <FormField
                  label="Phone"
                  value={form.phone}
                  onChangeText={v => setForm(s => ({...s, phone: v}))}
                  placeholder="Mobile number"
                  keyboardType="phone-pad"
                />
                <FormField
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
                    const active = form.gender === g.key;
                    return (
                      <TouchableOpacity
                        key={g.key}
                        style={[
                          styles.genderChip,
                          active && styles.genderChipOn,
                        ]}
                        onPress={() =>
                          setForm(s => ({...s, gender: g.key}))
                        }
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
                onPress={() => void onSaveNew()}
                activeOpacity={0.88}>
                {adding ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Save customer</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

function FormField({
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
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  listHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.navy,
    paddingVertical: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F8ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.green,
  },
  rowBody: {flex: 1, minWidth: 0},
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  rowPhone: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedLight,
  },
  memberBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: colors.green,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalSafe: {flex: 1, backgroundColor: colors.background},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
  },
  modalHeaderSpacer: {width: 22},
  formScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  fieldLabel: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  fieldInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: colors.white,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  genderChipOn: {
    borderColor: colors.green,
    backgroundColor: '#E8F8ED',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  genderTextOn: {
    color: colors.green,
    fontWeight: '800',
  },
  formFooter: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.green,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveBtnDisabled: {opacity: 0.55},
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
