import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  menuItemImageChanged,
  menuItemImageValue,
  resolveMediaUrl,
  useCreateTaxMutation,
  useGetCategoriesQuery,
  useGetTaxesQuery,
  useUpdateMenuItemMutation,
  useUpdateMenuItemStockSettingsMutation,
  useUploadImageMutation,
  useUploadMenuItemPhotoMutation,
} from '../services/menuApi';
import { useGetPosInitQuery } from '../services/posApi';
import type { ProfileStackParamList } from '../navigation/types';
import { CameraIcon, Card, CloseIcon, GradientButton, TopHeader } from '../components/ui';
import { showDialog } from '../context/DialogProvider';
import { cardShadow, colors, radii, spacing } from '../theme';
import {
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';
import {
  ensureCameraPermission,
  ensureGalleryPermission,
  handlePickerPermissionError,
} from '../utils/mediaPermissions';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditMenuItem'>;

function assetFileMeta(asset: Asset) {
  const uri = asset.uri ?? '';
  const fileName =
    asset.fileName ??
    `menu-${Date.now()}.${(asset.type ?? 'image/jpeg').split('/')[1] || 'jpg'}`;
  const mimeType = asset.type ?? 'image/jpeg';
  return { uri, fileName, mimeType };
}

function readAutomaticInventoryEnabled(
  item: {
    automatic_inventory_enabled?: boolean;
    automaticInventoryEnabled?: boolean;
  } | undefined,
): boolean {
  if (!item) {
    return false;
  }
  return Boolean(
    item.automatic_inventory_enabled ?? item.automaticInventoryEnabled,
  );
}

export const EditMenuItemScreen: React.FC<Props> = ({ navigation, route }) => {
  const { menuItemId, image: initialImage } = route.params;

  const [title, setTitle] = useState(route.params.title);
  const [description, setDescription] = useState(route.params.description);
  const [price, setPrice] = useState(route.params.price);
  const [netPrice, setNetPrice] = useState(route.params.netPrice);
  const [categoryId, setCategoryId] = useState<string | null>(
    route.params.categoryId || null,
  );
  const [taxId, setTaxId] = useState<string | null>(
    route.params.taxId || null,
  );
  const [uploadedImagePath, setUploadedImagePath] = useState(
    initialImage?.trim() ?? '',
  );
  const [localPreviewUri, setLocalPreviewUri] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [newTaxTitle, setNewTaxTitle] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxType, setNewTaxType] = useState<'percentage' | 'exclusive'>(
    'percentage',
  );
  const [automaticInventoryEnabled, setAutomaticInventoryEnabled] = useState(
    route.params.automaticInventoryEnabled ?? false,
  );

  const {
    data: apiCategories,
    isLoading: loadingCategories,
    isError: categoriesApiError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();
  const { data: posInit } = useGetPosInitQuery(undefined, {
    skip: !categoriesApiError && (apiCategories?.length ?? 0) > 0,
  });

  const {
    data: taxes = [],
    isLoading: loadingTaxes,
    isError: taxesError,
    refetch: refetchTaxes,
  } = useGetTaxesQuery();

  const [createTax, { isLoading: creatingTax }] = useCreateTaxMutation();
  const [updateMenuItem, { isLoading: savingMenu }] = useUpdateMenuItemMutation();
  const [updateMenuItemStockSettings, { isLoading: savingStock }] =
    useUpdateMenuItemStockSettingsMutation();
  const [uploadMenuItemPhoto, { isLoading: savingPhoto }] =
    useUploadMenuItemPhotoMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadImageMutation();

  const saving = savingMenu || savingStock || savingPhoto;

  useEffect(() => {
    if (route.params.automaticInventoryEnabled !== undefined) {
      return;
    }
    const item = posInit?.menuItems?.find(
      menuItem => String(menuItem.id) === menuItemId,
    );
    if (item) {
      setAutomaticInventoryEnabled(readAutomaticInventoryEnabled(item));
    }
  }, [menuItemId, posInit?.menuItems, route.params.automaticInventoryEnabled]);

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
      c =>
        (c.is_enabled ?? c.isEnabled ?? true) !== false || c.id === categoryId,
    );
  }, [apiCategories, posInit?.categories, categoryId]);

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
    const { uri, fileName, mimeType } = assetFileMeta(asset);
    if (!uri) {
      showDialog('Image', 'Could not read the selected photo.');
      return;
    }

    setLocalPreviewUri(uri);
    setUploadedImagePath('');
    setUploadedFileName('');

    try {
      const res = await uploadImage({ uri, fileName, mimeType }).unwrap();
      setUploadedImagePath(res.url);
      setUploadedFileName(res.filename ?? fileName);
    } catch (e: unknown) {
      setLocalPreviewUri('');
      if (initialImage?.trim()) {
        setUploadedImagePath(initialImage.trim());
      }
      const err = e as { error?: string; data?: { message?: string } };
      showDialog(
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
        showDialog(
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
        showDialog('Camera', 'Camera is not available on this device.');
        return;
      }
      if (!handlePickerPermissionError(result.errorCode, 'camera')) {
        showDialog('Camera', result.errorMessage ?? 'Could not open camera.');
      }
      return;
    }

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }
    await uploadPickedAsset(result.assets[0]);
  };

  const onChooseImage = () => {
    showDialog('Menu image', 'Choose a source', [
      { text: 'Gallery', onPress: () => void onPickFromGallery() },
      { text: 'Camera', onPress: () => void onTakePhoto() },
      { text: 'Cancel', style: 'cancel' },
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
      showDialog('Tax', 'Enter tax name and rate.');
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
      const err = e as { data?: { message?: string } };
      showDialog('Could not add tax', err?.data?.message ?? 'Please try again.');
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      showDialog('Menu item', 'Enter item name.');
      return;
    }
    if (!price.trim() || !netPrice.trim()) {
      showDialog('Menu item', 'Enter price and net price.');
      return;
    }
    if (!categoryId) {
      showDialog('Menu item', 'Select a category.');
      return;
    }
    if (!taxId) {
      showDialog('Menu item', 'Select a tax.');
      return;
    }
    if (!uploadedImagePath.trim()) {
      showDialog('Menu item', 'Add a photo before saving.');
      return;
    }

    const image = menuItemImageValue(uploadedImagePath);
    if (!image) {
      showDialog('Menu item', 'Uploaded image URL is invalid.');
      return;
    }

    const body = {
      title: title.trim(),
      description: description.trim(),
      price: price.trim(),
      netPrice: netPrice.trim(),
      categoryId,
      taxId,
    };

    const imageChanged = menuItemImageChanged(uploadedImagePath, initialImage);

    try {
      const tasks: Array<Promise<unknown>> = [
        updateMenuItem({ id: menuItemId, ...body }).unwrap(),
        updateMenuItemStockSettings({
          id: menuItemId,
          automaticInventoryEnabled,
        }).unwrap(),
      ];

      if (imageChanged) {
        tasks.push(
          uploadMenuItemPhoto({ id: menuItemId, image }).unwrap(),
        );
      }

      const results = await Promise.all(tasks);
      const menuRes = results[0] as { message?: string };
      showDialog('Success', menuRes.message ?? 'Menu item updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; error?: string };
      showDialog(
        'Update failed',
        err?.data?.message ?? err?.error ?? 'Please check fields and try again.',
      );
    }
  };

  const loadingLists = loadingCategories || loadingTaxes;

  const canSave =
    Boolean(title.trim()) &&
    Boolean(price.trim()) &&
    Boolean(netPrice.trim()) &&
    Boolean(categoryId) &&
    Boolean(taxId) &&
    Boolean(uploadedImagePath.trim()) &&
    !uploadingImage;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TopHeader
            title="Edit menu item"
            subtitle={title.trim() || 'Update dish details'}
            onBack={() => navigation.goBack()}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <SectionCard
              step="1"
              title="Basic details"
              hint="Name, description & pricing">
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
              hint="Gallery or camera — uploads before save">
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
                      source={{ uri: previewImage }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.previewEmpty}>
                      <View style={styles.previewIconCircle}>
                        <CameraIcon
                          size={moderateScale(32)}
                          color={colors.muted}
                        />
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

            <SectionCard
              step="5"
              title="Stock settings"
              hint="Link inventory deductions to this menu item">
              <View style={styles.stockToggleRow}>
                <View style={styles.stockToggleBody}>
                  <Text style={styles.stockToggleTitle}>
                    Automatic inventory
                  </Text>
                  <Text style={styles.stockToggleHint}>
                    Deduct linked recipe stock when this item is sold
                  </Text>
                </View>
                <View style={styles.onOffControl}>
                  <TouchableOpacity
                    style={[
                      styles.onOffBtn,
                      styles.onOffBtnLeft,
                      automaticInventoryEnabled && styles.onOffBtnActive,
                    ]}
                    onPress={() => setAutomaticInventoryEnabled(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: automaticInventoryEnabled }}
                    accessibilityLabel="Automatic inventory on">
                    <Text
                      style={[
                        styles.onOffBtnText,
                        automaticInventoryEnabled && styles.onOffBtnTextActive,
                      ]}>
                      ON
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.onOffBtn,
                      styles.onOffBtnRight,
                      !automaticInventoryEnabled && styles.onOffBtnActiveOff,
                    ]}
                    onPress={() => setAutomaticInventoryEnabled(false)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !automaticInventoryEnabled }}
                    accessibilityLabel="Automatic inventory off">
                    <Text
                      style={[
                        styles.onOffBtnText,
                        !automaticInventoryEnabled && styles.onOffBtnTextActive,
                      ]}>
                      OFF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SectionCard>
            <View style={styles.footer}>
              <GradientButton
                title={saving ? 'Saving…' : 'Save changes'}
                onPress={onSubmit}
                loading={saving}
                disabled={saving || !canSave}
                showArrow={false}
              />
            </View>
          </ScrollView>
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
          <TouchableOpacity onPress={onAction} hitSlop={scale(8)}>
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
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
              hitSlop={scale(8)}>
              <CloseIcon size={moderateScale(22)} color={colors.navy} />
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
  sectionCardTitles: { flex: 1, flexShrink: 1 },
  sectionCardTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  sectionCardHint: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(17),
    flexShrink: 1,
  },
  sectionAction: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.green,
    flexShrink: 0,
  },
  sectionCardBody: {
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
  inputMultiline: {
    minHeight: verticalScale(96),
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: 0,
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
    marginTop: spacing.md,
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
  emptyHint: {
    fontSize: moderateScale(14),
    color: colors.muted,
    lineHeight: moderateScale(20),
    flexShrink: 1,
  },
  errorHint: {
    fontSize: moderateScale(14),
    color: colors.error,
    fontWeight: '600',
    flexShrink: 1,
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
    aspectRatio: 4 / 3,
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  previewIconCircle: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  previewEmptyIcon: {
    fontSize: moderateScale(26),
  },
  previewEmptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  previewEmptyText: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(13),
    color: colors.muted,
    fontWeight: '500',
    flexShrink: 1,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  uploadingText: {
    color: colors.white,
    fontSize: moderateScale(13),
    fontWeight: '700',
    flexShrink: 1,
  },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: spacing.lg,
  },
  imageActionBtnPrimary: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: radii.md,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  imageActionTextPrimary: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.white,
  },
  imageActionBtnOutline: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  imageActionTextOutline: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.muted,
  },
  uploadedMeta: {
    marginTop: spacing.md,
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(18),
    flexShrink: 1,
  },
  imageHint: {
    marginTop: spacing.md,
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(18),
    flexShrink: 1,
  },
  stockToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stockToggleBody: { flex: 1, flexShrink: 1 },
  stockToggleTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
    flexShrink: 1,
  },
  stockToggleHint: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(18),
    flexShrink: 1,
  },
  onOffControl: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    flexShrink: 0,
  },
  onOffBtn: {
    minWidth: scale(52),
    paddingVertical: verticalScale(10),
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  onOffBtnLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  onOffBtnRight: {},
  onOffBtnActive: {
    backgroundColor: colors.green,
  },
  onOffBtnActiveOff: {
    backgroundColor: colors.navy,
  },
  onOffBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  onOffBtnTextActive: {
    color: colors.white,
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
    maxHeight: '85%',
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
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: moderateScale(18),
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
  modalClose: {
    fontSize: moderateScale(16),
    color: colors.muted,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.muted,
    marginBottom: verticalScale(8),
  },
  typeRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: spacing.lg,
  },
  typeChip: {
    flex: 1,
    paddingVertical: verticalScale(10),
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
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.navy,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  typeChipTextActive: {
    color: colors.white,
  },
});
