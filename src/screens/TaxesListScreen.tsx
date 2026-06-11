import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useCreateTaxMutation,
  useDeleteTaxMutation,
  useGetTaxesQuery,
  useUpdateTaxMutation,
  type SettingsTax,
} from '../services/menuApi';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {
  Card,
  CloseIcon,
  EditIcon,
  GradientButton,
  ReceiptIcon,
  SearchIcon,
  TopHeader,
  TopHeaderAction,
  TrashIcon,
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

type Props = NativeStackScreenProps<ProfileStackParamList, 'TaxesList'>;

const TAX_TYPES = ['percentage', 'exclusive'] as const;

export const TaxesListScreen: React.FC<Props> = ({navigation, route}) => {
  const [query, setQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingTax, setEditingTax] = useState<SettingsTax | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [typeInput, setTypeInput] = useState<(typeof TAX_TYPES)[number]>(
    'percentage',
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const {data, isLoading, isFetching, isError, refetch} = useGetTaxesQuery();
  const [createTax, {isLoading: creating}] = useCreateTaxMutation();
  const [updateTax, {isLoading: updating}] = useUpdateTaxMutation();
  const [deleteTax] = useDeleteTaxMutation();

  const taxes = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(tax => {
      const title = (tax.title ?? '').toLowerCase();
      const type = (tax.type ?? '').toLowerCase();
      return title.includes(q) || type.includes(q) || String(tax.rate).includes(q);
    });
  }, [data, query]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const percentage = list.filter(t => t.type === 'percentage').length;
    return {
      total: list.length,
      percentage,
      exclusive: list.length - percentage,
    };
  }, [data]);

  const openCreate = () => {
    setEditingTax(null);
    setTitleInput('');
    setRateInput('');
    setTypeInput('percentage');
    setFormVisible(true);
  };

  const openEdit = (tax: SettingsTax) => {
    setEditingTax(tax);
    setTitleInput(tax.title ?? '');
    setRateInput(String(tax.rate ?? ''));
    setTypeInput(
      tax.type === 'exclusive' ? 'exclusive' : 'percentage',
    );
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingTax(null);
    setTitleInput('');
    setRateInput('');
    setTypeInput('percentage');
  };

  const onSaveTax = async () => {
    const title = titleInput.trim();
    const rate = rateInput.trim();
    if (!title || !rate) {
      showDialog('Tax', 'Enter tax name and rate.');
      return;
    }

    try {
      if (editingTax) {
        const res = await updateTax({
          id: editingTax.id,
          title,
          rate,
          type: typeInput,
        }).unwrap();
        showDialog('Updated', res.message ?? 'Tax updated.');
      } else {
        const res = await createTax({
          title,
          rate,
          type: typeInput,
        }).unwrap();
        showDialog('Created', res.message ?? 'Tax created.');
      }
      closeForm();
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      showDialog(
        editingTax ? 'Update failed' : 'Create failed',
        err?.data?.message ?? 'Please try again.',
      );
    }
  };

  const onDelete = (tax: SettingsTax) => {
    showDialog(
      'Delete tax',
      `Remove "${tax.title}"? Menu items using this tax may be affected.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(tax.id);
            try {
              const res = await deleteTax({id: tax.id}).unwrap();
              showDialog('Deleted', res.message ?? 'Tax deleted.');
            } catch (e: unknown) {
              const err = e as {data?: {message?: string}};
              showDialog(
                'Delete failed',
                err?.data?.message ?? 'Could not delete tax.',
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statTotal]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statPercent]}>
          <Text style={styles.statValue}>{stats.percentage}</Text>
          <Text style={styles.statLabel}>Percentage</Text>
        </View>
        <View style={[styles.statCard, styles.statExclusive]}>
          <Text style={styles.statValue}>{stats.exclusive}</Text>
          <Text style={styles.statLabel}>Exclusive</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchIcon size={moderateScale(18)} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search taxes…"
          placeholderTextColor={colors.mutedLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Taxes"
          subtitle="Billing tax rates"
          onBack={() =>
            handleProfileStackBack(navigation, route.params?.fromSideMenu)
          }
          right={<TopHeaderAction label="+ Add" onPress={openCreate} />}
        />

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Card style={styles.emptyCard}>
              <ReceiptIcon size={moderateScale(44)} color={colors.muted} />
              <Text style={styles.emptyTitle}>Could not load taxes</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <FlatList
            data={taxes}
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
                onRefresh={refetch}
                colors={[colors.green]}
                tintColor={colors.green}
              />
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <ReceiptIcon size={moderateScale(44)} color={colors.muted} />
                <Text style={styles.emptyTitle}>No taxes yet</Text>
                <Text style={styles.emptyText}>
                  {query.trim()
                    ? 'Try another search.'
                    : 'Add your first tax for menu billing.'}
                </Text>
                {!query.trim() ? (
                  <TouchableOpacity style={styles.retryBtn} onPress={openCreate}>
                    <Text style={styles.retryText}>Add tax</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            }
            renderItem={({item}) => {
              const rowBusy = busyId === item.id;
              return (
                <Card style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowIcon}>
                      <ReceiptIcon
                        size={moderateScale(20)}
                        color={colors.navy}
                      />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.rate}% · {item.type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openEdit(item)}
                      disabled={rowBusy}
                      accessibilityLabel="Edit tax">
                      <EditIcon size={moderateScale(18)} color={colors.navy} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => onDelete(item)}
                      disabled={rowBusy}
                      accessibilityLabel="Delete tax">
                      <TrashIcon size={moderateScale(18)} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  {rowBusy ? (
                    <ActivityIndicator
                      color={colors.green}
                      style={styles.rowLoader}
                    />
                  ) : null}
                </Card>
              );
            }}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeForm} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTax ? 'Edit tax' : 'New tax'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closeForm}
                hitSlop={8}>
                <CloseIcon size={moderateScale(22)} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Tax name</Text>
            <TextInput
              style={styles.input}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="GST 18%"
              placeholderTextColor={colors.mutedLight}
            />

            <Text style={styles.fieldLabel}>Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={rateInput}
              onChangeText={setRateInput}
              placeholder="18"
              placeholderTextColor={colors.mutedLight}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TAX_TYPES.map(type => {
                const active = typeInput === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setTypeInput(type)}
                    activeOpacity={0.85}>
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GradientButton
              title={
                creating || updating
                  ? 'Saving…'
                  : editingTax
                    ? 'Save changes'
                    : 'Add tax'
              }
              onPress={() => void onSaveTax()}
              loading={creating || updating}
              disabled={creating || updating}
              showArrow={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  safe: {flex: 1},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  listHeader: {gap: spacing.md, marginBottom: spacing.xs},
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
  statPercent: {backgroundColor: '#DCFCE7'},
  statExclusive: {backgroundColor: '#FFEDD5'},
  statValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: colors.navy,
  },
  statLabel: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: verticalScale(11),
    fontSize: moderateScale(15),
    color: colors.navy,
  },
  rowCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: radii.md,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {flex: 1, minWidth: 0},
  rowTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
  },
  rowMeta: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'capitalize',
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: radii.md,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {backgroundColor: '#FEE2E2'},
  rowLoader: {marginTop: spacing.sm},
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  retryBtn: {
    marginTop: spacing.md,
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
  },
  modalHandle: {
    alignSelf: 'center',
    width: scale(40),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
  },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: colors.navy,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  typeChipText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.navy,
    textTransform: 'capitalize',
  },
  typeChipTextActive: {
    color: colors.white,
  },
});
