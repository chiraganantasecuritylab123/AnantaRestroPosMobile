import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useChangeCategoryVisibilityMutation,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
  type SettingsCategory,
} from '../services/menuApi';
import type {ProfileStackParamList} from '../navigation/types';
import {handleProfileStackBack} from '../navigation/profileStackBack';
import {
  Card,
  CloseIcon,
  EditIcon,
  GradientButton,
  GridIcon,
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

type Props = NativeStackScreenProps<ProfileStackParamList, 'CategoriesList'>;

function isCategoryEnabled(category: SettingsCategory): boolean {
  if (category.isEnabled !== undefined) {
    return category.isEnabled;
  }
  if (category.is_enabled !== undefined) {
    return category.is_enabled;
  }
  return true;
}

export const CategoriesListScreen: React.FC<Props> = ({navigation, route}) => {
  const [query, setQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SettingsCategory | null>(
    null,
  );
  const [titleInput, setTitleInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const {data, isLoading, isFetching, isError, refetch} = useGetCategoriesQuery();
  const [createCategory, {isLoading: creating}] = useCreateCategoryMutation();
  const [updateCategory, {isLoading: updating}] = useUpdateCategoryMutation();
  const [changeVisibility] = useChangeCategoryVisibilityMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const categories = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(cat => (cat.title ?? '').toLowerCase().includes(q));
  }, [data, query]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const enabled = list.filter(isCategoryEnabled).length;
    return {
      total: list.length,
      enabled,
      hidden: list.length - enabled,
    };
  }, [data]);

  const openCreate = () => {
    setEditingCategory(null);
    setTitleInput('');
    setFormVisible(true);
  };

  const openEdit = (category: SettingsCategory) => {
    setEditingCategory(category);
    setTitleInput(category.title ?? '');
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingCategory(null);
    setTitleInput('');
  };

  const onSaveCategory = async () => {
    const title = titleInput.trim();
    if (!title) {
      showDialog('Category', 'Enter a category name.');
      return;
    }

    try {
      if (editingCategory) {
        const res = await updateCategory({id: editingCategory.id, title}).unwrap();
        showDialog('Updated', res.message ?? 'Category updated.');
      } else {
        const res = await createCategory({title}).unwrap();
        showDialog('Created', res.message ?? 'Category created.');
      }
      closeForm();
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      showDialog(
        editingCategory ? 'Update failed' : 'Create failed',
        err?.data?.message ?? 'Please try again.',
      );
    }
  };

  const onToggleVisibility = async (category: SettingsCategory) => {
    const nextEnabled = !isCategoryEnabled(category);
    setBusyId(category.id);
    try {
      await changeVisibility({
        id: category.id,
        isEnabled: nextEnabled,
      }).unwrap();
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      showDialog(
        'Visibility',
        err?.data?.message ?? 'Could not update category visibility.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (category: SettingsCategory) => {
    showDialog(
      'Delete category',
      `Remove "${category.title}"? Menu items in this category may be affected.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(category.id);
            try {
              const res = await deleteCategory({id: category.id}).unwrap();
              showDialog('Deleted', res.message ?? 'Category deleted.');
            } catch (e: unknown) {
              const err = e as {data?: {message?: string}};
              showDialog(
                'Delete failed',
                err?.data?.message ?? 'Could not delete category.',
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
        <View style={[styles.statCard, styles.statEnabled]}>
          <Text style={styles.statValue}>{stats.enabled}</Text>
          <Text style={styles.statLabel}>Visible</Text>
        </View>
        <View style={[styles.statCard, styles.statHidden]}>
          <Text style={styles.statValue}>{stats.hidden}</Text>
          <Text style={styles.statLabel}>Hidden</Text>
        </View>
      </View>

        <View style={styles.searchWrap}>
          <SearchIcon size={moderateScale(18)} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories…"
            placeholderTextColor={colors.mutedLight}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      {/* <Card style={styles.toolsCard}>
      </Card> */}
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Categories"
          subtitle="POS menu groups"
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
              <GridIcon size={moderateScale(44)} color={colors.muted} />
              <Text style={styles.emptyTitle}>Could not load categories</Text>
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
            data={categories}
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
                <GridIcon size={moderateScale(44)} color={colors.muted} />
                <Text style={styles.emptyTitle}>No categories yet</Text>
                <Text style={styles.emptyText}>
                  {query.trim()
                    ? 'Try another search.'
                    : 'Add your first category for the POS menu.'}
                </Text>
                {!query.trim() ? (
                  <TouchableOpacity style={styles.retryBtn} onPress={openCreate}>
                    <Text style={styles.retryText}>Add category</Text>
                  </TouchableOpacity>
                ) : null}
              </Card>
            }
            renderItem={({item}) => {
              const enabled = isCategoryEnabled(item);
              const rowBusy = busyId === item.id;
              return (
                <Card style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowIcon}>
                      <GridIcon size={moderateScale(20)} color={colors.navy} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          enabled ? styles.statusEnabled : styles.statusHidden,
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            enabled ? styles.statusTextEnabled : styles.statusTextHidden,
                          ]}>
                          {enabled ? 'Visible on POS' : 'Hidden'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <View style={styles.visibilitySwitchRow}>
                      <Text style={styles.visibilitySwitchLabel}>Visible</Text>
                      <Switch
                        value={enabled}
                        onValueChange={value => {
                          if (value !== enabled) {
                            void onToggleVisibility(item);
                          }
                        }}
                        disabled={rowBusy}
                        trackColor={{
                          false: colors.border,
                          true: `${colors.green}55`,
                        }}
                        thumbColor={enabled ? colors.green : colors.white}
                        ios_backgroundColor={colors.border}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openEdit(item)}
                      disabled={rowBusy}
                      accessibilityLabel="Edit category">
                      <EditIcon size={moderateScale(18)} color={colors.navy} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => onDelete(item)}
                      disabled={rowBusy}
                      accessibilityLabel="Delete category">
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
                {editingCategory ? 'Edit category' : 'New category'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closeForm}
                hitSlop={8}>
                <CloseIcon size={moderateScale(22)} color={colors.navy} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Category name</Text>
            <TextInput
              style={styles.input}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Beverages"
              placeholderTextColor={colors.mutedLight}
              autoFocus
            />
            <GradientButton
              title={
                creating || updating
                  ? 'Saving…'
                  : editingCategory
                    ? 'Save changes'
                    : 'Add category'
              }
              onPress={() => void onSaveCategory()}
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
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statTotal: {backgroundColor: '#DBEAFE'},
  statEnabled: {backgroundColor: '#DCFCE7'},
  statHidden: {backgroundColor: '#F3F4F6'},
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
    textTransform: 'uppercase',
  },
  toolsCard: {padding: spacing.lg},
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    color: colors.navy,
  },
  resultCount: {
    marginTop: spacing.sm,
    fontSize: moderateScale(12),
    color: colors.muted,
    fontWeight: '600',
  },
  rowCard: {padding: spacing.lg},
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {flex: 1, minWidth: 0},
  rowTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: colors.navy,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: radii.pill,
  },
  statusEnabled: {backgroundColor: '#DCFCE7'},
  statusHidden: {backgroundColor: '#F3F4F6'},
  statusText: {fontSize: moderateScale(11), fontWeight: '700'},
  statusTextEnabled: {color: '#15803D'},
  statusTextHidden: {color: colors.muted},
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  visibilitySwitchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  visibilitySwitchLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.muted,
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
    marginBottom: spacing.lg,
  },
});
