import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {
  useCancelSubscriptionMutation,
  useGetSubscriptionDetailsQuery,
  useSignoutMutation,
  type SubscriptionBillingEntry,
} from '../services/authApi';
import { useGetConfigQuery } from '../services/configApi';
import {
  menuItemImageValue,
  useUploadImageMutation,
} from '../services/menuApi';
import {
  useGetStoreSettingsQuery,
  useUpdateStoreSettingsMutation,
  useUploadStoreImageMutation,
  type StoreSettings,
} from '../services/storeSettingsApi';
import { showDialog } from '../context/DialogProvider';
import { updateSubscriptionActive } from '../features/authTokenSlice';
import { useAppDispatch, useAppSelector } from '../useAppHooks';
import { performAppLogout } from '../store';
import { usePrinterStatus } from '../hooks/usePrinterStatus';
import {
  Card,
  CloseIcon,
  ConfirmDialog,
  EditIcon,
  GradientButton,
  Icon,
  LogOutIcon,
} from '../components/ui';
import type { IconName } from '../components/ui';
import { getBrandHeroColors } from '../theme/colors';
import { colors, cardShadow, radii, spacing, typography } from '../theme';
import {
  isTablet,
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';
import type { MainTabParamList, ProfileStackParamList } from '../navigation/types';
import { formatUserPhoneDisplay } from '../utils/countryDialCodes';
import { formatMoney, resolveCurrencySymbol } from '../utils/currency';
import { openExternalUrl } from '../utils/openExternalUrl';
import {
  ensureCameraPermission,
  ensureGalleryPermission,
  handlePickerPermissionError,
} from '../utils/mediaPermissions';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

const H_PAD = spacing.xl;
const SHORTCUT_GAP = scale(10);

type Shortcut = {
  key: string;
  label: string;
  hint: string;
  iconName: IconName;
  bg: string;
  onPress: () => void;
  badge?: string;
};

type StoreFormState = {
  storeName: string;
  address: string;
  currency: string;
  isQRMenuEnabled: boolean;
  isQROrderEnabled: boolean;
  isFeedbackEnabled: boolean;
};

function storeToForm(store: StoreSettings): StoreFormState {
  return {
    storeName: store.storeName ?? '',
    address: store.address ?? '',
    currency: store.currency ?? 'INR',
    isQRMenuEnabled: store.isQRMenuEnabled ?? false,
    isQROrderEnabled: store.isQROrderEnabled ?? false,
    isFeedbackEnabled: store.isFeedbackEnabled ?? false,
  };
}

function assetFileMeta(asset: Asset) {
  const uri = asset.uri ?? '';
  const fileName =
    asset.fileName ??
    `store-${Date.now()}.${(asset.type ?? 'image/jpeg').split('/')[1] || 'jpg'}`;
  const mimeType = asset.type ?? 'image/jpeg';
  return { uri, fileName, mimeType };
}

function formatSubscriptionDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatUsageLimit(used: number, limit: number | null | undefined): string {
  if (limit == null) {
    return `${used}`;
  }
  return `${used} / ${limit}`;
}

function formatBillingStatus(status: string): string {
  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPlanAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount == null || amount <= 0) {
    return 'Free';
  }
  return formatMoney(amount, currency, 0);
}

function buildStoreUpdatePayload(
  store: StoreSettings,
  overrides: Partial<{
    storeName: string;
    address: string;
    currency: string;
    isQRMenuEnabled: boolean;
    isQROrderEnabled: boolean;
    isFeedbackEnabled: boolean;
  }> = {},
) {
  return {
    storeName: store.storeName ?? '',
    address: store.address ?? '',
    currency: store.currency ?? 'INR',
    isQRMenuEnabled: store.isQRMenuEnabled ?? false,
    isQROrderEnabled: store.isQROrderEnabled ?? false,
    isFeedbackEnabled: store.isFeedbackEnabled ?? false,
    ...overrides,
  };
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const user = useAppSelector(state => state.authToken.user);
  const [signout] = useSignoutMutation();
  const dispatch = useAppDispatch();
  const {
    data: storeSettings,
    isLoading: storeLoading,
    isFetching: storeFetching,
    refetch: refetchStore,
  } = useGetStoreSettingsQuery();
  const [updateStoreSettings, { isLoading: savingStore }] =
    useUpdateStoreSettingsMutation();
  const [uploadStoreImage, { isLoading: savingStoreImageApi }] =
    useUploadStoreImageMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadImageMutation();
  const { data: appConfig } = useGetConfigQuery();
  const { snapshot: printerSnapshot } = usePrinterStatus();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [cancelSubscriptionVisible, setCancelSubscriptionVisible] =
    useState(false);
  const {
    data: subscriptionDetails,
    isLoading: subscriptionLoading,
    isFetching: subscriptionFetching,
    isError: subscriptionError,
    refetch: refetchSubscription,
  } = useGetSubscriptionDetailsQuery({ lang: 'en' });
  const [cancelSubscription, { isLoading: cancellingSubscription }] =
    useCancelSubscriptionMutation();
  const [editVisible, setEditVisible] = useState(false);
  const [localStoreImageUri, setLocalStoreImageUri] = useState('');
  const [savingStoreImage, setSavingStoreImage] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreFormState>({
    storeName: '',
    address: '',
    currency: 'INR',
    isQRMenuEnabled: false,
    isQROrderEnabled: false,
    isFeedbackEnabled: false,
  });

  const { width: windowWidth } = useWindowDimensions();
  const shortcutW = useMemo(() => {
    const contentW = isTablet() ? maxContentWidth() : windowWidth;
    return (contentW - H_PAD * 2 - SHORTCUT_GAP) / 2;
  }, [windowWidth]);

  const brand = useMemo(
    () => getBrandHeroColors(appConfig?.data?.branding),
    [
      appConfig?.data?.branding?.primary_color,
      appConfig?.data?.branding?.secondary_color,
    ],
  );

  const initials = useMemo(() => {
    const n = user?.name ?? 'Waiter';
    return n
      .split(' ')
      .map(s => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const roleLabel = (user?.role ?? 'waiter').replace(/_/g, ' ');
  const subscriptionActive =
    subscriptionDetails?.is_active === 1 &&
    user?.is_subscription_active !== false;
  const canCancelSubscription = Boolean(
    subscriptionDetails?.id &&
    subscriptionDetails?.subscription_id &&
    subscriptionDetails.is_active === 1,
  );
  const recentBilling = (subscriptionDetails?.billingHistory ?? []).slice(0, 3);
  const storeName =
    storeSettings?.storeName?.trim() || 'Your restaurant';
  const storeImage =
    storeSettings?.storeImage?.trim() || storeSettings?.image?.trim() || null;
  const displayStoreImage = localStoreImageUri || storeImage;
  const uploadingStoreImage =
    uploadingImage || savingStoreImage || savingStoreImageApi;
  const currencyLabel = storeSettings?.currency
    ? `${resolveCurrencySymbol(storeSettings.currency)} (${storeSettings.currency})`
    : '—';
  const support = appConfig?.data?.contact_support;

  useEffect(() => {
    if (storeSettings && editVisible) {
      setStoreForm(storeToForm(storeSettings));
    }
  }, [storeSettings, editVisible]);

  const openStoreEdit = () => {
    if (storeSettings) {
      setStoreForm(storeToForm(storeSettings));
    }
    setEditVisible(true);
  };

  const closeStoreEdit = () => setEditVisible(false);

  const onSaveStore = async () => {
    const storeNameInput = storeForm.storeName.trim();
    const address = storeForm.address.trim();
    const currency = storeForm.currency.trim();
    if (!storeNameInput) {
      showDialog('Store', 'Enter store name.');
      return;
    }
    if (!currency) {
      showDialog('Store', 'Enter currency code (e.g. INR).');
      return;
    }
    if (!storeSettings) {
      return;
    }
    try {
      const res = await updateStoreSettings(
        buildStoreUpdatePayload(storeSettings, {
          storeName: storeNameInput,
          address,
          currency,
          isQRMenuEnabled: storeForm.isQRMenuEnabled,
          isQROrderEnabled: storeForm.isQROrderEnabled,
          isFeedbackEnabled: storeForm.isFeedbackEnabled,
        }),
      ).unwrap();
      setEditVisible(false);
      showDialog('Saved', res.message ?? 'Store details updated.');
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; error?: string };
      showDialog(
        'Could not save',
        err?.data?.message ?? err?.error ?? 'Please try again.',
      );
    }
  };

  const saveStoreImage = async (uploadedPath: string) => {
    if (!storeSettings) {
      showDialog('Store', 'Store details are not loaded yet.');
      return;
    }
    const image = menuItemImageValue(uploadedPath);
    if (!image) {
      showDialog('Store image', 'Uploaded image URL is invalid.');
      return;
    }
    setSavingStoreImage(true);
    try {
      const res = await uploadStoreImage({ image }).unwrap();
      setLocalStoreImageUri('');
      showDialog('Saved', res.message ?? 'Store image updated.');
    } catch (e: unknown) {
      setLocalStoreImageUri('');
      const err = e as { data?: { message?: string }; error?: string };
      showDialog(
        'Could not save',
        err?.data?.message ?? err?.error ?? 'Please try again.',
      );
    } finally {
      setSavingStoreImage(false);
    }
  };

  const uploadPickedStoreImage = async (asset: Asset) => {
    const { uri, fileName, mimeType } = assetFileMeta(asset);
    if (!uri) {
      showDialog('Image', 'Could not read the selected photo.');
      return;
    }

    setLocalStoreImageUri(uri);

    try {
      const res = await uploadImage({ uri, fileName, mimeType }).unwrap();
      await saveStoreImage(res.url);
    } catch (e: unknown) {
      setLocalStoreImageUri('');
      const err = e as { error?: string; data?: { message?: string } };
      showDialog(
        'Upload failed',
        err?.data?.message ?? err?.error ?? 'Could not upload image.',
      );
    }
  };

  const onPickStoreImageFromGallery = async () => {
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
    await uploadPickedStoreImage(result.assets[0]);
  };

  const onTakeStorePhoto = async () => {
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
    await uploadPickedStoreImage(result.assets[0]);
  };

  const onChooseStoreImage = () => {
    if (!storeSettings) {
      showDialog('Store', 'Store details are not loaded yet.');
      return;
    }
    showDialog('Store image', 'Choose a source', [
      { text: 'Gallery', onPress: () => void onPickStoreImageFromGallery() },
      { text: 'Camera', onPress: () => void onTakeStorePhoto() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const scopeTags = useMemo(() => {
    if (!user?.scope?.trim()) {
      return [];
    }
    return user.scope
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [user?.scope]);

  const printerBadge =
    printerSnapshot.connectionStatus === 'connected'
      ? 'Online'
      : printerSnapshot.connectionStatus === 'connecting'
        ? '…'
        : undefined;

  const shortcuts: Shortcut[] = [
    {
      key: 'printer',
      label: 'Printer',
      hint: 'Status & settings',
      iconName: 'printer',
      bg: '#DBEAFE',
      badge: printerBadge,
      onPress: () => navigation.navigate('PrinterMenu'),
    },
    {
      key: 'menu-list',
      label: 'Menu items',
      hint: 'View & edit dishes',
      iconName: 'utensils',
      bg: '#DCFCE7',
      onPress: () => navigation.navigate('MenuItemsList'),
    },
    {
      key: 'taxes',
      label: 'Taxes',
      hint: 'Billing tax rates',
      iconName: 'receipt',
      bg: '#FFEDD5',
      onPress: () => navigation.navigate('TaxesList'),
    },
    {
      key: 'categories',
      label: 'Categories',
      hint: 'Create, edit & visibility',
      iconName: 'grid',
      bg: '#EDE9FE',
      onPress: () => navigation.navigate('CategoriesList'),
    },
    {
      key: 'inventory',
      label: 'Inventory',
      hint: 'Stock & thresholds',
      iconName: 'package',
      bg: '#FEE2E2',
      onPress: () => navigation.navigate('InventoryList'),
    },
    {
      key: 'sales-history',
      label: 'Sales history',
      hint: 'Sales summary & history',
      iconName: 'bar-chart',
      bg: '#FEF3C7',
      onPress: () =>
        navigation.navigate('Orders', {
          screen: 'SalesOrders',
          params: { fromProfile: true },
        }),
    }
  ];

  const performLogout = () =>
    performAppLogout(dispatch, () => signout().unwrap());

  const onLogoutPress = () => setLogoutConfirmVisible(true);

  const onLogoutCancel = () => setLogoutConfirmVisible(false);

  const onLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
    void performLogout();
  };

  const onCancelSubscriptionPress = () => setCancelSubscriptionVisible(true);

  const onCancelSubscriptionDismiss = () => setCancelSubscriptionVisible(false);

  const onCancelSubscriptionConfirm = async () => {
    if (!subscriptionDetails?.id || !subscriptionDetails.subscription_id) {
      showDialog('Subscription', 'Subscription details are not available.');
      setCancelSubscriptionVisible(false);
      return;
    }

    try {
      const res = await cancelSubscription({
        id: subscriptionDetails.id,
        subscriptionId: subscriptionDetails.subscription_id,
      }).unwrap();

      setCancelSubscriptionVisible(false);
      dispatch(updateSubscriptionActive(res.is_subscription_active));
      showDialog(
        'Subscription cancelled',
        res.message ??
        'Your subscription has been cancelled. Choose a plan to continue.',
        [{ text: 'OK' }],
      );
      void refetchSubscription();
    } catch (e: any) {
      setCancelSubscriptionVisible(false);
      showDialog(
        'Could not cancel',
        e?.data?.message ?? 'Please try again or contact support.',
      );
    }
  };

  const onRefreshProfile = () => {
    void refetchStore();
    void refetchSubscription();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet() && {
              maxWidth: maxContentWidth(),
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={
                (storeFetching && !storeLoading) ||
                (subscriptionFetching && !subscriptionLoading)
              }
              onRefresh={onRefreshProfile}
              colors={[colors.green]}
              tintColor={colors.green}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={[styles.heroBand, { backgroundColor: brand.hero }]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroEyebrow}>My account</Text>
              <View>
                {storeLoading && !storeSettings ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.heroStore} numberOfLines={2}>
                    {storeName}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={openStoreEdit}
              disabled={!storeSettings || storeLoading}
              activeOpacity={0.85}
              hitSlop={8}
              style={[
                styles.heroEditBtn,
                (!storeSettings || storeLoading) && styles.heroEditBtnDisabled,
              ]}>
              <EditIcon size={moderateScale(18)} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.identityCard}>
            <TouchableOpacity style={[styles.avatarRing, { borderWidth: 3, borderColor: '#000' }]} onPress={onChooseStoreImage}>
              {displayStoreImage ? (
                <Image
                  source={{ uri: displayStoreImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: brand.hero },
                  ]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {/* <TouchableOpacity
                style={[
                  styles.avatarEditBtn,
                  { backgroundColor: brand.hero },
                ]}
                onPress={onChooseStoreImage}
                disabled={uploadingStoreImage || !storeSettings}
                activeOpacity={0.85}
                accessibilityLabel="Update store image">
                {uploadingStoreImage ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <EditIcon size={moderateScale(13)} color={colors.white} />
                )}
              </TouchableOpacity> */}
              <View style={[styles.activeDot, { backgroundColor: brand.hero }]} />
            </TouchableOpacity>
            <Text style={styles.displayName}>{user?.name ?? 'Team member'}</Text>
            <View style={styles.metaRow}>
              <View style={styles.roleChip}>
                <Text style={[styles.roleChipText, { color: brand.heroDark }]}>
                  {roleLabel}
                </Text>
              </View>
              {user?.designation ? (
                <Text style={styles.designation} numberOfLines={1}>
                  {user.designation}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <View style={styles.shortcutGrid}>
            {shortcuts.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.shortcutCard, { width: shortcutW }]}
                activeOpacity={0.88}
                onPress={s.onPress}>
                <View style={[styles.shortcutIcon, { backgroundColor: s.bg }]}>
                  <Icon name={s.iconName} size={moderateScale(22)} color={colors.navy} />
                </View>
                <View style={styles.shortcutText}>
                  <View style={styles.shortcutTitleRow}>
                    <Text style={styles.shortcutLabel}>{s.label}</Text>
                    {s.badge ? (
                      <View style={styles.shortcutBadge}>
                        <Text style={styles.shortcutBadgeText}>{s.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.shortcutHint} numberOfLines={1}>
                    {s.hint}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Store details</Text>
          <Card style={styles.detailCard}>
            <ContactRow
              iconName="globe"
              label="Address"
              value={storeSettings?.address?.trim() || '—'}
            />
            <View style={styles.divider} />
            <ContactRow
              iconName="phone"
              label="Store phone"
              value={formatUserPhoneDisplay(
                storeSettings?.tenantPhone,
                storeSettings?.countryCode,
              )}
            />
            <View style={styles.divider} />
            <ContactRow
              iconName="mail"
              label="Store email"
              value={storeSettings?.email?.trim() || '—'}
            />
            <View style={styles.divider} />
            <ContactRow
              iconName="receipt"
              label="Currency"
              value={currencyLabel}
            />
            <View style={styles.divider} />
            <ToggleRow
              iconName="grid"
              label="QR menu"
              value={storeSettings?.isQRMenuEnabled ?? false}
            />
            <View style={styles.divider} />
            <ToggleRow
              iconName="shopping-bag"
              label="QR orders"
              value={storeSettings?.isQROrderEnabled ?? false}
            />
            <View style={styles.divider} />
            <ToggleRow
              iconName="clipboard"
              label="Customer feedback"
              value={storeSettings?.isFeedbackEnabled ?? false}
            />
          </Card>

          {/* <Text style={styles.sectionTitle}>My details</Text>
          <Card style={styles.detailCard}>
            <ContactRow iconName="mail" label="Email" value={user?.email ?? '—'} />
            <View style={styles.divider} />
            <ContactRow
              iconName="phone"
              label="Phone"
              value={formatUserPhoneDisplay(
                user?.phone,
                user?.phone_country_code,
              )}
            />
            <View style={styles.divider} />
          </Card> */}

          <Text style={styles.sectionTitle}>Subscription</Text>
          <Card style={styles.detailCard}>
            {subscriptionLoading ? (
              <View style={styles.subscriptionLoading}>
                <ActivityIndicator color={colors.green} />
                <Text style={styles.subscriptionLoadingText}>
                  Loading subscription…
                </Text>
              </View>
            ) : subscriptionError ? (
              <View style={styles.subscriptionState}>
                <Text style={styles.subscriptionStateTitle}>
                  Unable to load subscription
                </Text>
                <TouchableOpacity
                  onPress={() => void refetchSubscription()}
                  activeOpacity={0.85}>
                  <Text style={styles.subscriptionRetryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.subscriptionHeaderText}>
                    <Text style={styles.subscriptionPlanName}>
                      {subscriptionDetails?.planName?.trim() || 'No active plan'}
                    </Text>
                    <View
                      style={[
                        styles.subscriptionStatusChip,
                        subscriptionActive
                          ? styles.subscriptionStatusActive
                          : styles.subscriptionStatusInactive,
                      ]}>
                      <Text
                        style={[
                          styles.subscriptionStatusText,
                          subscriptionActive
                            ? styles.subscriptionStatusTextActive
                            : styles.subscriptionStatusTextInactive,
                        ]}>
                        {subscriptionActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subscriptionAmount}>
                    {formatPlanAmount(
                      subscriptionDetails?.planAmount,
                      subscriptionDetails?.planCurrency,
                    )}
                  </Text>
                </View>

                <View style={styles.divider} />
                <ContactRow
                  iconName="calendar"
                  label="Started"
                  value={formatSubscriptionDate(
                    subscriptionDetails?.subscription_start,
                  )}
                />
                <View style={styles.divider} />
                <ContactRow
                  iconName="clock"
                  label="Renews / ends"
                  value={formatSubscriptionDate(
                    subscriptionDetails?.subscription_end,
                  )}
                />
                {subscriptionDetails?.planDurationDays ? (
                  <>
                    <View style={styles.divider} />
                    <ContactRow
                      iconName="receipt"
                      label="Billing cycle"
                      value={`${subscriptionDetails.planDurationDays} days`}
                    />
                  </>
                ) : null}

                {subscriptionDetails?.usageSummary ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.subscriptionSubheading}>Usage</Text>
                    <ContactRow
                      iconName="globe"
                      label="Outlets"
                      value={formatUsageLimit(
                        subscriptionDetails.usageSummary.outletsUsed,
                        subscriptionDetails.usageSummary.outletsLimit,
                      )}
                    />
                    <View style={styles.divider} />
                    <ContactRow
                      iconName="users"
                      label="Users"
                      value={formatUsageLimit(
                        subscriptionDetails.usageSummary.usersUsed,
                        subscriptionDetails.usageSummary.usersLimit,
                      )}
                    />
                    <View style={styles.divider} />
                    <ContactRow
                      iconName="bar-chart"
                      label="Orders this month"
                      value={String(
                        subscriptionDetails.usageSummary.ordersThisMonth,
                      )}
                    />
                  </>
                ) : null}

                {recentBilling.length > 0 ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.subscriptionSubheading}>
                      Billing history
                    </Text>
                    {recentBilling.map((entry, index) => (
                      <React.Fragment key={entry.id}>
                        {index > 0 ? <View style={styles.divider} /> : null}
                        <BillingHistoryRow entry={entry} />
                      </React.Fragment>
                    ))}
                  </>
                ) : null}

                {canCancelSubscription ? (
                  <TouchableOpacity
                    style={styles.cancelSubscriptionBtn}
                    onPress={onCancelSubscriptionPress}
                    disabled={cancellingSubscription}
                    activeOpacity={0.85}>
                    <Text style={styles.cancelSubscriptionText}>
                      Cancel subscription
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Need Help?</Text>
          <Card style={styles.detailCard}>
            <ContactRow
              iconName="mail"
              label="Email"
              value={support?.email?.value ?? 'Not configured'}
              onPress={() =>
                void openExternalUrl(
                  support?.email?.mailto_url ?? support?.email?.gmail_url,
                )
              }
            />
            <View style={styles.divider} />
            <ContactRow
              iconName="phone"
              label="Phone"
              value={support?.phone?.value ?? 'Not configured'}
              onPress={() => void openExternalUrl(support?.phone?.tel_url)}
            />
          </Card>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogoutPress}
            activeOpacity={0.9}>
            <LogOutIcon size={moderateScale(20)} color="#B91C1C" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Logging out clears your session on this device. Login again to
            continue using POS.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={closeStoreEdit}>
        <Pressable style={styles.modalBackdrop} onPress={closeStoreEdit}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalAvoid}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update store</Text>
                <TouchableOpacity onPress={closeStoreEdit} hitSlop={8}>
                  <CloseIcon size={moderateScale(22)} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Store name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={storeForm.storeName}
                  onChangeText={v => setStoreForm(s => ({ ...s, storeName: v }))}
                  placeholder="Store name"
                  placeholderTextColor={colors.mutedLight}
                />
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline]}
                  value={storeForm.address}
                  onChangeText={v => setStoreForm(s => ({ ...s, address: v }))}
                  placeholder="Address"
                  placeholderTextColor={colors.mutedLight}
                  multiline
                />
                <Text style={styles.fieldLabel}>Currency</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={storeForm.currency}
                  onChangeText={v =>
                    setStoreForm(s => ({ ...s, currency: v.toUpperCase() }))
                  }
                  placeholder="INR"
                  placeholderTextColor={colors.mutedLight}
                  autoCapitalize="characters"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>QR menu enabled</Text>
                  <Switch
                    value={storeForm.isQRMenuEnabled}
                    onValueChange={v =>
                      setStoreForm(s => ({ ...s, isQRMenuEnabled: v }))
                    }
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>QR orders enabled</Text>
                  <Switch
                    value={storeForm.isQROrderEnabled}
                    onValueChange={v =>
                      setStoreForm(s => ({ ...s, isQROrderEnabled: v }))
                    }
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Customer feedback</Text>
                  <Switch
                    value={storeForm.isFeedbackEnabled}
                    onValueChange={v =>
                      setStoreForm(s => ({ ...s, isFeedbackEnabled: v }))
                    }
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
                <GradientButton
                  title="Save changes"
                  onPress={() => void onSaveStore()}
                  loading={savingStore}
                  showArrow={false}
                  style={styles.saveBtn}
                />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Logout?"
        message="Your session on this device will end. Login again to continue using POS."
        cancelLabel="Cancel"
        confirmLabel="Logout"
        destructive
        icon={<LogOutIcon size={moderateScale(26)} color={colors.error} />}
        onCancel={onLogoutCancel}
        onConfirm={onLogoutConfirm}
      />

      <ConfirmDialog
        visible={cancelSubscriptionVisible}
        title="Cancel subscription?"
        message="You will lose access when the current billing period ends. You can choose a new plan afterwards."
        cancelLabel="Keep plan"
        confirmLabel="Cancel subscription"
        destructive
        onCancel={onCancelSubscriptionDismiss}
        onConfirm={() => void onCancelSubscriptionConfirm()}
      />
    </View>
  );
};

function BillingHistoryRow({ entry }: { entry: SubscriptionBillingEntry }) {
  return (
    <View style={styles.billingRow}>
      <View style={styles.billingMain}>
        <Text style={styles.billingPlan}>{entry.plan}</Text>
        <Text style={styles.billingMeta}>
          {formatSubscriptionDate(entry.date)} · {entry.invoiceId}
        </Text>
      </View>
      <View style={styles.billingSide}>
        <Text style={styles.billingAmount}>
          {entry.amount > 0
            ? formatMoney(entry.amount, 'INR', 0)
            : 'Free'}
        </Text>
        <Text style={styles.billingStatus}>
          {formatBillingStatus(entry.status)}
        </Text>
      </View>
    </View>
  );
}

function ToggleRow({
  iconName,
  label,
  value,
}: {
  iconName: IconName;
  label: string;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.contactIconWrap}>
        <Icon name={iconName} size={moderateScale(18)} color={colors.muted} />
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={[styles.toggleValue, value && styles.toggleValueOn]}>
        {value ? 'Enabled' : 'Disabled'}
      </Text>
    </View>
  );
}

function ContactRow({
  iconName,
  label,
  value,
  mono,
  onPress,
}: {
  iconName: IconName;
  label: string;
  value: string;
  mono?: boolean;
  onPress?: () => void;
}) {
  const row = (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Icon name={iconName} size={moderateScale(18)} color={colors.muted} />
      </View>
      <View style={styles.contactBody}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text
          style={[styles.contactValue, mono && styles.contactValueMono]}
          numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {row}
      </TouchableOpacity>
    );
  }

  return row;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  heroBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -H_PAD,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.xxl,
    paddingBottom: verticalScale(100),
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl
  },
  heroTopRow: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  heroEyebrow: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroEditBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroEditBtnDisabled: {
    opacity: 0.45,
  },
  heroStoreRow: {
    // marginTop: verticalScale(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  heroStoreLogo: {
    width: scale(44),
    height: scale(44),
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroStore: {
    flex: 1,
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.white,
  },
  sectionHeaderRow: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleInline: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.navy,
  },
  sectionAction: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.green,
  },
  sectionActionDisabled: {
    color: colors.mutedLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.navy,
  },
  toggleValue: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.muted,
  },
  toggleValueOn: {
    color: colors.greenDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalAvoid: {
    maxHeight: '88%',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '100%',
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
  },
  fieldLabel: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: verticalScale(6),
    marginTop: spacing.md,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
    backgroundColor: colors.white,
  },
  fieldInputMultiline: {
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingVertical: verticalScale(4),
  },
  switchLabel: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.navy,
    marginRight: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.xxl,
  },
  identityCard: {
    marginTop: verticalScale(-50),
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingTop: verticalScale(52),
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...cardShadow,
  },
  avatarRing: {
    position: 'absolute',
    top: verticalScale(-44),
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: colors.white,
    padding: scale(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
  },
  avatarEditBtn: {
    position: 'absolute',
    top: verticalScale(2),
    right: scale(2),
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarText: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: colors.white,
  },
  activeDot: {
    position: 'absolute',
    bottom: verticalScale(6),
    right: scale(6),
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 2,
    borderColor: colors.white,
  },
  displayName: {
    ...typography.hero,
    fontSize: moderateScale(22),
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: spacing.sm,
  },
  roleChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: radii.pill,
  },
  roleChipText: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  designation: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
    maxWidth: '60%',
  },
  outletId: {
    marginTop: spacing.sm,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.mutedLight,
  },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.navy,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SHORTCUT_GAP,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...cardShadow,
  },
  shortcutIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutEmoji: { fontSize: moderateScale(22) },
  shortcutText: { flex: 1, minWidth: 0 },
  shortcutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  shortcutLabel: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.navy,
  },
  shortcutBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: radii.pill,
  },
  shortcutBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: colors.greenDark,
  },
  shortcutHint: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    color: colors.muted,
  },
  detailCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  contactIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: { fontSize: moderateScale(18) },
  contactBody: { flex: 1, minWidth: 0 },
  contactLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: verticalScale(4),
  },
  contactValue: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
  },
  contactValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: moderateScale(13),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: scale(56),
  },
  scopeCard: {
    padding: spacing.lg,
  },
  scopeIntro: {
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(19),
    marginBottom: spacing.md,
  },
  scopeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  scopeTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.pill,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scopeTagText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  subscriptionLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  subscriptionLoadingText: {
    fontSize: moderateScale(14),
    color: colors.muted,
    fontWeight: '600',
  },
  subscriptionState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  subscriptionStateTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  subscriptionRetryText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.green,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subscriptionHeaderText: {
    flex: 1,
    gap: spacing.sm,
  },
  subscriptionPlanName: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
  },
  subscriptionStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: radii.pill,
  },
  subscriptionStatusActive: {
    backgroundColor: '#DCFCE7',
  },
  subscriptionStatusInactive: {
    backgroundColor: '#FEE2E2',
  },
  subscriptionStatusText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  subscriptionStatusTextActive: {
    color: colors.green,
  },
  subscriptionStatusTextInactive: {
    color: colors.error,
  },
  subscriptionAmount: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
  },
  subscriptionSubheading: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  billingMain: {
    flex: 1,
  },
  billingPlan: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
  },
  billingMeta: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
  },
  billingSide: {
    alignItems: 'flex-end',
  },
  billingAmount: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.navy,
  },
  billingStatus: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'right',
  },
  cancelSubscriptionBtn: {
    marginVertical: spacing.md,
    paddingVertical: verticalScale(12),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    backgroundColor: colors.errorBg,
    alignItems: 'center',
  },
  cancelSubscriptionText: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: colors.error,
  },
  logoutBtn: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderRadius: radii.lg,
    paddingVertical: verticalScale(16),
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  logoutIcon: {
    fontSize: moderateScale(18),
    color: colors.error,
    fontWeight: '700',
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: moderateScale(16),
    fontWeight: '800',
  },
  footer: {
    marginTop: spacing.lg,
    fontSize: moderateScale(12),
    color: colors.muted,
    lineHeight: moderateScale(18),
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
