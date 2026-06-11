import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSignoutMutation } from '../../services/authApi';
import { useGetPosInitQuery } from '../../services/posApi';
import { useAppDispatch } from '../../useAppHooks';
import { performAppLogout } from '../../store';
import { useAppMenu } from '../../context/AppMenuContext';
import { useOptionalNavigationLeaveGuard } from '../../context/NavigationLeaveGuardContext';
import type {
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '../../navigation/types';
import { Icon, ConfirmDialog, LogOutIcon } from '../ui';
import type { IconName } from '../ui';
import { getAppVersion } from '../../constants/appVersion';
import { colors, radii, spacing } from '../../theme';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

const DRAWER_W = Math.min(
  Dimensions.get('window').width * 0.86,
  scale(340),
);

/** Side menu renders outside Tab.Navigator — use root stack + nested tab routes. */
type Nav = NativeStackNavigationProp<RootStackParamList>;

function goToTab(
  navigation: Nav,
  params: NavigatorScreenParams<MainTabParamList>,
) {
  navigation.navigate('MainTabs', params);
}

type ProfileMenuScreen = Exclude<
  keyof ProfileStackParamList,
  'EditMenuItem' | 'EditInventoryItem'
>;

function goToProfileScreen(navigation: Nav, screen: ProfileMenuScreen) {
  goToTab(navigation, {
    screen: 'Profile',
    params: {
      state: {
        routes: [{ name: screen, params: { fromSideMenu: true } }],
        index: 0,
      },
    },
  });
}

type MenuItem = {
  key: string;
  label: string;
  iconName: IconName;
  iconBg: string;
  trailing?: string;
  onPress: () => void;
};

type MenuSection = {
  key: string;
  title?: string;
  items: MenuItem[];
};

function MenuRow({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
        <Icon name={item.iconName} size={moderateScale(18)} color={colors.navy} />
      </View>
      <Text style={[styles.rowLabel, item.key === 'logout' && { color: colors.error }]}>{item.label}</Text>
      <View style={styles.rowRight}>
        {item.trailing ? (
          <Text style={styles.rowTrailing}>{item.trailing}</Text>
        ) : null}
        <Icon name="chevron-right" size={moderateScale(18)} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

export const AppSideMenu: React.FC = () => {
  const { menuVisible, closeMenu } = useAppMenu();
  const leaveGuard = useOptionalNavigationLeaveGuard();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { data: posInit } = useGetPosInitQuery();
  const [signout] = useSignoutMutation();

  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const storeName =
    posInit?.storeSettings?.store_name?.trim() || 'Ananta Restaurant';

  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideX.setValue(-DRAWER_W);
      fade.setValue(0);
    }
  }, [menuVisible, slideX, fade]);

  const navigate = (action: () => void) => {
    closeMenu();
    requestAnimationFrame(() => {
      if (leaveGuard?.attemptNavigation(action)) {
        action();
      }
    });
  };

  const performLogout = () =>
    performAppLogout(dispatch, () => signout().unwrap());

  const onLogoutPress = () => {
    closeMenu();
    requestAnimationFrame(() => setLogoutConfirmVisible(true));
  };

  const onLogoutCancel = () => setLogoutConfirmVisible(false);

  const onLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
    void performLogout();
  };

  const menuSections: MenuSection[] = [
    {
      key: 'main',
      items: [
        {
          key: 'profile',
          label: 'Profile',
          iconName: 'user',
          iconBg: '#DBEAFE',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'ProfileMain')),
        },
        {
          key: 'print',
          label: 'Printing Invoice',
          iconName: 'printer',
          iconBg: '#FFEDD5',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'PrinterMenu')),
        },
        {
          key: 'pos',
          label: 'POS',
          iconName: 'cart',
          iconBg: '#DCFCE7',
          onPress: () =>
            navigate(() =>
              goToTab(navigation, { screen: 'POS', params: { screen: 'PosHome' } }),
            ),
        },
        {
          key: 'orders',
          label: 'Orders',
          iconName: 'clipboard',
          iconBg: '#E0E7FF',
          onPress: () =>
            navigate(() =>
              goToTab(navigation, {
                screen: 'Orders',
                params: { screen: 'OrdersMain' },
              }),
            ),
        },
        {
          key: 'sales-history',
          label: 'Sales history',
          iconName: 'bar-chart',
          iconBg: '#FEF3C7',
          onPress: () =>
            navigate(() =>
              goToTab(navigation, {
                screen: 'Orders',
                params: {
                  screen: 'SalesOrders',
                  params: {fromSideMenu: true},
                },
              }),
            ),
        },
      ],
    },
    {
      key: 'related',
      title: 'Related links',
      items: [
        {
          key: 'menuItems',
          label: 'Menu Items',
          iconName: 'utensils',
          iconBg: '#D1FAE5',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'MenuItemsList')),
        },
        {
          key: 'categories',
          label: 'Categories',
          iconName: 'grid',
          iconBg: '#EDE9FE',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'CategoriesList')),
        },
        {
          key: 'taxes',
          label: 'Taxes',
          iconName: 'receipt',
          iconBg: '#FCE7F3',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'TaxesList')),
        },
        {
          key: 'inventory',
          label: 'Inventory',
          iconName: 'bar-chart',
          iconBg: '#CCFBF1',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'InventoryList')),
        },
        {
          key: 'customer',
          label: 'Customers',
          iconName: 'users',
          iconBg: '#F3E8FF',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'Customers')),
        },
        {
          key: 'printer-settings',
          label: 'Printer settings',
          iconName: 'settings',
          iconBg: '#E2E8F0',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'PrinterSettings')),
        },
      ],
    },
    {
      key: 'account',
      items: [
        {
          key: 'logout',
          label: 'Logout',
          iconName: 'logout',
          iconBg: '#FEE2E2',
          onPress: onLogoutPress,
        },
      ],
    },
  ];

  const LOGO_SIZE = scale(52);

  return (
    <>
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <Animated.View style={[styles.backdrop, { opacity: fade }]} />
          </Pressable>

          <Animated.View
            style={[styles.drawer, { transform: [{ translateX: slideX }] }]}>
            <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Image
                  source={require('../../assets/logo-dark.png')}
                  style={[
                    styles.logo,
                    { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2 },
                  ]}
                  resizeMode="contain"
                />
                <View style={styles.headerText}>
                  <Text style={styles.storeName} numberOfLines={2}>
                    {storeName}
                  </Text>
                  <Text style={styles.storeSub}>Restaurant</Text>
                </View>
              </View>

              <View style={styles.headerDivider} />

              <ScrollView
                style={styles.menuScroll}
                showsVerticalScrollIndicator={false}
                bounces={false}>
                {menuSections.map(section => (
                  <View key={section.key}>
                    {section.title ? (
                      <Text style={[styles.sectionTitle]}>{section.title}</Text>
                    ) : null}
                    {section.items.map(item => (
                      <MenuRow
                        key={item.key}
                        item={item}
                        onPress={item.onPress}
                      />
                    ))}
                  </View>
                ))}
                <View style={styles.versionFooter}>
                  <Text style={styles.versionText}>
                    version {getAppVersion()}
                  </Text>
                </View>
              </ScrollView>

            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Sign out?"
        message="Your session on this device will end. Sign in again to continue using POS."
        cancelLabel="Cancel"
        confirmLabel="Sign out"
        destructive
        icon={<LogOutIcon size={moderateScale(26)} color={colors.error} />}
        onCancel={onLogoutCancel}
        onConfirm={onLogoutConfirm}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: scale(4), height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(12),
    elevation: 16,
  },
  drawerSafe: { flex: 1 },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  logo: {
    backgroundColor: '#FEF9C3',
    flexShrink: 0,
  },
  headerText: { flex: 1, minWidth: 0 },
  storeName: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.navy,
  },
  storeSub: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(14),
    color: colors.muted,
    fontWeight: '500',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  menuScroll: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  versionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(18),
  },
  versionText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.mutedLight,
    textAlign: 'center',
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: colors.navy,
    minWidth: 0,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    maxWidth: '38%',
    flexShrink: 0,
  },
  rowTrailing: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'capitalize',
  },
});
