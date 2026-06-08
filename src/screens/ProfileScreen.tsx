import React, {useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {useSignoutMutation} from '../services/authApi';
import {useGetConfigQuery} from '../services/configApi';
import {useGetPosInitQuery} from '../services/posApi';
import {logout} from '../features/authTokenSlice';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {usePrinterStatus} from '../hooks/usePrinterStatus';
import {Card, ConfirmDialog, Icon, LogOutIcon} from '../components/ui';
import type {IconName} from '../components/ui';
import {getBrandHeroColors} from '../theme/colors';
import {colors, cardShadow, radii, spacing, typography} from '../theme';
import type {MainTabParamList, ProfileStackParamList} from '../navigation/types';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = spacing.xl;
const SHORTCUT_GAP = 10;
const SHORTCUT_W = (SCREEN_W - H_PAD * 2 - SHORTCUT_GAP) / 2;

type Shortcut = {
  key: string;
  label: string;
  hint: string;
  iconName: IconName;
  bg: string;
  onPress: () => void;
  badge?: string;
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const user = useAppSelector(state => state.authToken.user);
  const outletId = useAppSelector(state => state.authToken.outletId);
  const [signout] = useSignoutMutation();
  const dispatch = useAppDispatch();
  const {data: posInit} = useGetPosInitQuery();
  const {data: appConfig} = useGetConfigQuery();
  const {snapshot: printerSnapshot} = usePrinterStatus();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const brand = useMemo(
    () => getBrandHeroColors(appConfig?.data?.branding),
    [appConfig?.data?.branding?.primary_color],
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
  const storeName =
    posInit?.storeSettings?.store_name?.trim() || 'Your restaurant';

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
      bg: '#EDE9FE',
      onPress: () => navigation.navigate('InventoryList'),
    },
  ];

  const performLogout = async () => {
    try {
      await signout().unwrap();
    } catch {
      // local logout always runs even if network fails.
    } finally {
      dispatch(logout());
    }
  };

  const onLogoutPress = () => setLogoutConfirmVisible(true);

  const onLogoutCancel = () => setLogoutConfirmVisible(false);

  const onLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
    void performLogout();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.heroBand, {backgroundColor: brand.hero}]}>
            <Text style={styles.heroEyebrow}>My account</Text>
            <Text style={styles.heroStore} numberOfLines={1}>
              {storeName}
            </Text>
          </View>

          <View style={styles.identityCard}>
            <View style={styles.avatarRing}>
              {user?.photo ? (
                <Image
                  source={{uri: user.photo}}
                  style={styles.avatarImage}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    {backgroundColor: brand.hero},
                  ]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={[styles.activeDot, {backgroundColor: brand.hero}]} />
            </View>
            <Text style={styles.displayName}>{user?.name ?? 'Team member'}</Text>
            <View style={styles.metaRow}>
              <View style={styles.roleChip}>
                <Text style={[styles.roleChipText, {color: brand.heroDark}]}>
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
                style={[styles.shortcutCard, {width: SHORTCUT_W}]}
                activeOpacity={0.88}
                onPress={s.onPress}>
                <View style={[styles.shortcutIcon, {backgroundColor: s.bg}]}>
                  <Icon name={s.iconName} size={22} color={colors.navy} />
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

          <Text style={styles.sectionTitle}>Contact</Text>
          <Card style={styles.detailCard}>
            <ContactRow iconName="mail" label="Email" value={user?.email ?? '—'} />
            <View style={styles.divider} />
            <ContactRow iconName="phone" label="Phone" value={user?.phone ?? '—'} />
            <View style={styles.divider} />
            <ContactRow
              iconName="user"
              label="Username"
              value={user?.username ?? '—'}
              mono
            />
          </Card>

          <Text style={styles.sectionTitle}>More</Text>
          <Card style={styles.menuCard}>
            <MenuRow
              iconName="mail"
              iconBg="#DBEAFE"
              title="Contact support"
              subtitle={
                appConfig?.data?.contact_support?.email?.value ??
                'Email or call our team'
              }
              onPress={() => navigation.navigate('ContactSupport')}
            />
            <View style={styles.divider} />
            <MenuRow
              iconName="settings"
              iconBg="#F3F4F6"
              title="Printer settings"
              subtitle="Bluetooth pairing & paper width"
              onPress={() => navigation.navigate('PrinterSettings')}
            />
          </Card>

          {scopeTags.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <Card style={styles.scopeCard}>
                <Text style={styles.scopeIntro}>
                  Your account can access these areas:
                </Text>
                <View style={styles.scopeWrap}>
                  {scopeTags.map(tag => (
                    <View key={tag} style={styles.scopeTag}>
                      <Text style={[styles.scopeTagText, {color: brand.heroDark}]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogoutPress}
            activeOpacity={0.9}>
            <LogOutIcon size={20} color="#B91C1C" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Logging out clears your session on this device. Login again to
            continue using POS.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Logout?"
        message="Your session on this device will end. Login again to continue using POS."
        cancelLabel="Cancel"
        confirmLabel="Logout"
        destructive
        icon={<LogOutIcon size={26} color={colors.error} />}
        onCancel={onLogoutCancel}
        onConfirm={onLogoutConfirm}
      />
    </View>
  );
};

function ContactRow({
  iconName,
  label,
  value,
  mono,
}: {
  iconName: IconName;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIconWrap}>
        <Icon name={iconName} size={18} color={colors.muted} />
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
}

function MenuRow({
  iconName,
  iconBg,
  title,
  subtitle,
  onPress,
}: {
  iconName: IconName;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.85}>
      <View style={[styles.menuIconWrap, {backgroundColor: iconBg}]}>
        <Icon name={iconName} size={20} color={colors.navy} />
      </View>
      <View style={styles.menuBody}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safe: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  heroBand: {
    marginHorizontal: -H_PAD,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.md,
    paddingBottom: 56,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    minHeight: 170,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroStore: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  identityCard: {
    marginTop: -50,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingTop: 52,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...cardShadow,
  },
  avatarRing: {
    position: 'absolute',
    top: -44,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.white,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  displayName: {
    ...typography.hero,
    fontSize: 22,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  roleChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  designation: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    maxWidth: '60%',
  },
  outletId: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedLight,
  },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: 17,
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
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutEmoji: {fontSize: 22},
  shortcutText: {flex: 1, minWidth: 0},
  shortcutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  shortcutBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  shortcutBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.greenDark,
  },
  shortcutHint: {
    marginTop: 2,
    fontSize: 11,
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
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: {fontSize: 18},
  contactBody: {flex: 1, minWidth: 0},
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  contactValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  menuCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {fontSize: 20},
  menuBody: {flex: 1, minWidth: 0},
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  menuChevron: {
    fontSize: 26,
    fontWeight: '300',
    color: colors.mutedLight,
    marginTop: -2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  scopeCard: {
    padding: spacing.lg,
  },
  scopeIntro: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  scopeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scopeTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.lg,
    paddingVertical: 16,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  logoutIcon: {
    fontSize: 18,
    color: colors.error,
    fontWeight: '700',
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
