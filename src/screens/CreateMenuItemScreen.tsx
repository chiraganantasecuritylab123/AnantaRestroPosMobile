import React, {useCallback, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  menuItemImageValue,
  resolveMediaUrl,
  useCreateMenuItemMutation,
  useCreateTaxMutation,
  useGetCategoriesQuery,
  useGetTaxesQuery,
  useUploadImageMutation,
} from '../services/menuApi';
import {useGetPosInitQuery} from '../services/posApi';
import type {ProfileStackParamList} from '../navigation/types';
import {CameraIcon, Card, CloseIcon, GradientButton, TopHeader} from '../components/ui';
import {cardShadow, colors, radii, spacing} from '../theme';
import {
  ensureCameraPermission,
  ensureGalleryPermission,
  handlePickerPermissionError,
} from '../utils/mediaPermissions';

type Props = NativeStackScreenProps<ProfileStackParamList, 'CreateMenuItem'>;

function assetFileMeta(asset: Asset) {
  const uri = asset.uri ?? '';
  const fileName =
    asset.fileName ??
    `menu-${Date.now()}.${(asset.type ?? 'image/jpeg').split('/')[1] || 'jpg'}`;
  const mimeType = asset.type ?? 'image/jpeg';
  return {uri, fileName, mimeType};
}

export const CreateMenuItemScreen: React.FC<Props> = ({navigation}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [netPrice, setNetPrice] = useState('');
  const [uploadedImagePath, setUploadedImagePath] = useState('');
  const [localPreviewUri, setLocalPreviewUri] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [taxId, setTaxId] = useState<string | null>(null);

  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [newTaxTitle, setNewTaxTitle] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxType, setNewTaxType] = useState<'percentage' | 'exclusive'>(
    'percentage',
  );

  const {
    data: apiCategories,
    isLoading: loadingCategories,
    isError: categoriesApiError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();
  const {data: posInit} = useGetPosInitQuery(undefined, {
    skip: !categoriesApiError && (apiCategories?.length ?? 0) > 0,
  });
  const {
    data: taxes = [],
    isLoading: loadingTaxes,
    isError: taxesError,
    refetch: refetchTaxes,
  } = useGetTaxesQuery();

  const [createTax, {isLoading: creatingTax}] = useCreateTaxMutation();
  const [createMenuItem, {isLoading: creatingItem}] =
    useCreateMenuItemMutation();
  const [uploadImage, {isLoading: uploadingImage}] = useUploadImageMutation();

  useFocusEffect(
    useCallback(() => {
      void refetchCategories();
    }, [refetchCategories]),
  );

  const categories = useMemo(() => {
    const list = apiCategories?.length
      ? apiCategories
      : (posInit?.categories ?? []).map(c => ({
          id: String(c.id),
          title: c.title,
          is_enabled: c.is_enabled,
        }));
    return list.filter(
      c => (c.is_enabled ?? c.isEnabled ?? true) !== false,
    );
  }, [apiCategories, posInit?.categories]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedTax = taxes.find(t => t.id === taxId);
  const previewImage =
    localPreviewUri ||
    (uploadedImagePath ? resolveMediaUrl(uploadedImagePath) : '');

  const resetImage = () => {
    setUploadedImagePath('');
    setLocalPreviewUri('');
    setUploadedFileName('');
  };

  const uploadPickedAsset = async (asset: Asset) => {
    const {uri, fileName, mimeType} = assetFileMeta(asset);
    if (!uri) {
      Alert.alert('Image', 'Could not read the selected photo.');
      return;
    }

    setLocalPreviewUri(uri);
    setUploadedImagePath('');
    setUploadedFileName('');

    try {
      const res = await uploadImage({uri, fileName, mimeType}).unwrap();
      setUploadedImagePath(res.url);
      setUploadedFileName(res.filename ?? fileName);
    } catch (e: unknown) {
      setLocalPreviewUri('');
      const err = e as {error?: string; data?: {message?: string}};
      Alert.alert(
        'Upload failed',
        err?.data?.message ?? err?.error ?? 'Could not upload image.',
      );
    }
  };

  const onPickFromGallery = async () => {
    const allowed = await ensureGalleryPermission();
    if (!allowed) {
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
    });

    if (result.errorCode) {
      if (!handlePickerPermissionError(result.errorCode, 'gallery')) {
        Alert.alert(
          'Gallery',
          result.errorMessage ?? 'Could not open photo library.',
        );
      }
      return;
    }

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }
    await uploadPickedAsset(result.assets[0]);
  };

  const onTakePhoto = async () => {
    const allowed = await ensureCameraPermission();
    if (!allowed) {
      return;
    }

    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
    });

    if (result.errorCode) {
      if (result.errorCode === 'camera_unavailable') {
        Alert.alert('Camera', 'Camera is not available on this device.');
        return;
      }
      if (!handlePickerPermissionError(result.errorCode, 'camera')) {
        Alert.alert('Camera', result.errorMessage ?? 'Could not open camera.');
      }
      return;
    }

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }
    await uploadPickedAsset(result.assets[0]);
  };

  const onChooseImage = () => {
    Alert.alert('Menu image', 'Choose a source', [
      {text: 'Gallery', onPress: () => void onPickFromGallery()},
      {text: 'Camera', onPress: () => void onTakePhoto()},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const syncNetFromPrice = (value: string) => {
    setPrice(value);
    if (!netPrice.trim()) {
      setNetPrice(value);
    }
  };

  const onAddTax = async () => {
    const nextTitle = newTaxTitle.trim();
    const rate = newTaxRate.trim();
    if (!nextTitle || !rate) {
      Alert.alert('Tax', 'Enter tax name and rate.');
      return;
    }
    try {
      const res = await createTax({
        title: nextTitle,
        rate,
        type: newTaxType,
      }).unwrap();
      setTaxId(res.taxId);
      setNewTaxTitle('');
      setNewTaxRate('');
      setTaxModalOpen(false);
      refetchTaxes();
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      Alert.alert('Could not add tax', err?.data?.message ?? 'Please try again.');
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Menu item', 'Enter item name.');
      return;
    }
    if (!price.trim() || !netPrice.trim()) {
      Alert.alert('Menu item', 'Enter price and net price.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Menu item', 'Select a category.');
      return;
    }
    if (!taxId) {
      Alert.alert('Menu item', 'Select a tax.');
      return;
    }
    if (!uploadedImagePath.trim()) {
      Alert.alert('Menu item', 'Upload an image before saving.');
      return;
    }

    const image = menuItemImageValue(uploadedImagePath);
    if (!image) {
      Alert.alert('Menu item', 'Uploaded image URL is invalid.');
      return;
    }

    try {
      const res = await createMenuItem({
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        netPrice: netPrice.trim(),
        categoryId,
        taxId,
        image,
      }).unwrap();

      Alert.alert('Success', res.message ?? 'Menu item added.', [
        {
          text: 'Add another',
          onPress: () => {
            setTitle('');
            setDescription('');
            setPrice('');
            setNetPrice('');
            resetImage();
          },
        },
        {text: 'Done', onPress: () => navigation.goBack()},
      ]);
    } catch (e: unknown) {
      const err = e as {data?: {message?: string}};
      Alert.alert(
        'Could not add item',
        err?.data?.message ?? 'Please check fields and try again.',
      );
    }
  };

  const loadingLists = loadingCategories || loadingTaxes;

  const canSave =
    Boolean(title.trim()) &&
    Boolean(price.trim()) &&
    Boolean(categoryId) &&
    Boolean(taxId) &&
    Boolean(uploadedImagePath) &&
    !uploadingImage;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TopHeader
            title="Add menu item"
            subtitle="Details, category, tax & photo"
            onBack={() => navigation.goBack()}
          />

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <SectionCard
              step="1"
              title="Basic details"
              hint="Shown on POS and receipts">
              <Field
                label="Item name"
                value={title}
                onChangeText={setTitle}
                placeholder="Cheese Sev Puri"
              />
              <Field
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Short description for kitchen & menu"
                multiline
              />
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <Field
                    label="Price (MRP)"
                    value={price}
                    onChangeText={syncNetFromPrice}
                    placeholder="90"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Field
                    label="Net price"
                    value={netPrice}
                    onChangeText={setNetPrice}
                    placeholder="80"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard
              step="2"
              title="Category"
              hint="Groups items on the POS menu"
              actionLabel="Manage"
              onAction={() => navigation.navigate('CategoriesList')}>
              {loadingLists ? (
                <ActivityIndicator color={colors.green} style={styles.loader} />
              ) : categories.length === 0 ? (
                <Text style={styles.emptyHint}>
                  No categories yet. Tap Manage to create one.
                </Text>
              ) : (
                <View style={styles.chipGrid}>
                  {categories.map(cat => {
                    const active = categoryId === cat.id;
                    return (
                      <SelectChip
                        key={cat.id}
                        label={cat.title}
                        active={active}
                        onPress={() => setCategoryId(cat.id)}
                      />
                    );
                  })}
                </View>
              )}
              {selectedCategory ? (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>
                    ✓ {selectedCategory.title}
                  </Text>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard
              step="3"
              title="Tax"
              hint="Applied when billing"
              actionLabel="+ New"
              onAction={() => setTaxModalOpen(true)}>
              {taxesError ? (
                <TouchableOpacity onPress={() => refetchTaxes()}>
                  <Text style={styles.errorHint}>
                    Could not load taxes. Tap to retry.
                  </Text>
                </TouchableOpacity>
              ) : loadingTaxes ? (
                <ActivityIndicator color={colors.green} style={styles.loader} />
              ) : taxes.length === 0 ? (
                <Text style={styles.emptyHint}>
                  No taxes yet. Tap + New to create one.
                </Text>
              ) : (
                <View style={styles.chipGrid}>
                  {taxes.map(tax => {
                    const active = taxId === tax.id;
                    return (
                      <SelectChip
                        key={tax.id}
                        label={`${tax.title} (${tax.rate}%)`}
                        active={active}
                        onPress={() => setTaxId(tax.id)}
                      />
                    );
                  })}
                </View>
              )}
              {selectedTax ? (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>
                    ✓ {selectedTax.title} · {selectedTax.type}
                  </Text>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard
              step="4"
              title="Photo"
              hint="Required — uploads before save">
              <TouchableOpacity
                onPress={onChooseImage}
                disabled={uploadingImage}
                activeOpacity={0.92}>
                <View
                  style={[
                    styles.previewFrame,
                    !previewImage && styles.previewFrameEmpty,
                  ]}>
                  {previewImage ? (
                    <Image
                      source={{uri: previewImage}}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.previewEmpty}>
                      <View style={styles.previewIconCircle}>
                        <CameraIcon size={32} color={colors.muted} />
                      </View>
                      <Text style={styles.previewEmptyTitle}>Add dish photo</Text>
                      <Text style={styles.previewEmptyText}>
                        Gallery or camera
                      </Text>
                    </View>
                  )}
                  {uploadingImage ? (
                    <View style={styles.previewOverlay}>
                      <ActivityIndicator color={colors.white} size="large" />
                      <Text style={styles.uploadingText}>Uploading…</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>

              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageActionBtnPrimary}
                  onPress={onChooseImage}
                  disabled={uploadingImage}>
                  <Text style={styles.imageActionTextPrimary}>
                    {uploadedImagePath ? 'Change photo' : 'Choose photo'}
                  </Text>
                </TouchableOpacity>
                {uploadedImagePath ? (
                  <TouchableOpacity
                    style={styles.imageActionBtnOutline}
                    onPress={resetImage}
                    disabled={uploadingImage}>
                    <Text style={styles.imageActionTextOutline}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {uploadedFileName ? (
                <Text style={styles.uploadedMeta}>
                  File: {uploadedFileName}
                </Text>
              ) : (
                <Text style={styles.imageHint}>
                  Image is uploaded to the server, then linked to this menu item.
                </Text>
              )}
            </SectionCard>
          </ScrollView>

          <View style={styles.footer}>
            <GradientButton
              title={creatingItem ? 'Saving…' : 'Save menu item'}
              onPress={onSubmit}
              loading={creatingItem}
              disabled={creatingItem || !canSave}
              showArrow={false}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <FormModal
        visible={taxModalOpen}
        title="New tax"
        onClose={() => setTaxModalOpen(false)}>
        <Field
          label="Tax name"
          value={newTaxTitle}
          onChangeText={setNewTaxTitle}
          placeholder="GST 12%"
        />
        <Field
          label="Rate (%)"
          value={newTaxRate}
          onChangeText={setNewTaxRate}
          placeholder="12"
          keyboardType="decimal-pad"
        />
        <Text style={styles.modalLabel}>Type</Text>
        <View style={styles.typeRow}>
          {(['percentage', 'exclusive'] as const).map(type => {
            const active = newTaxType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setNewTaxType(type)}>
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
          title={creatingTax ? 'Adding…' : 'Add tax'}
          onPress={onAddTax}
          loading={creatingTax}
          disabled={creatingTax}
          showArrow={false}
        />
      </FormModal>
    </View>
  );
};

function SectionCard({
  step,
  title,
  hint,
  actionLabel,
  onAction,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionCardHead}>
        <View style={styles.sectionCardHeadLeft}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{step}</Text>
          </View>
          <View style={styles.sectionCardTitles}>
            <Text style={styles.sectionCardTitle}>{title}</Text>
            {hint ? (
              <Text style={styles.sectionCardHint}>{hint}</Text>
            ) : null}
          </View>
        </View>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} hitSlop={8}>
            <Text style={styles.sectionAction}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.sectionCardBody}>{children}</View>
    </Card>
  );
}

function SelectChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function FormModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
              hitSlop={8}>
              <CloseIcon size={22} color={colors.navy} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  flex: {flex: 1},
  safe: {flex: 1},
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
  sectionCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.borderLight,
  },
  sectionCardHeadLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
    paddingRight: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  sectionCardTitles: {flex: 1},
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  sectionCardHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  sectionCardBody: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.navy,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  halfField: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  selectedPill: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.greenDark,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  loader: {
    marginVertical: spacing.md,
  },
  previewFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    position: 'relative',
  },
  previewFrameEmpty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  previewIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  previewEmptyIcon: {
    fontSize: 26,
  },
  previewEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  previewEmptyText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  imageActionBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  imageActionTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  imageActionBtnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  imageActionTextOutline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  uploadedMeta: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  imageHint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    ...cardShadow,
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
    maxHeight: '85%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textTransform: 'capitalize',
  },
  typeChipTextActive: {
    color: colors.white,
  },
});
