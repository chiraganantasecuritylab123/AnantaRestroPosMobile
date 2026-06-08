import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSignoutMutation} from '../../services/authApi';
import {useGetPosInitQuery} from '../../services/posApi';
import {logout} from '../../features/authTokenSlice';
import {useAppDispatch, useAppSelector} from '../../useAppHooks';
import {useAppMenu} from '../../context/AppMenuContext';
import {resolveCurrencySymbol, RUPEE_SYMBOL} from '../../utils/currency';
import type {
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '../../navigation/types';
import {Icon, ConfirmDialog, LogOutIcon} from '../ui';
import type {IconName} from '../ui';
import {colors, radii, spacing} from '../../theme';

const DRAWER_W = Math.min(Dimensions.get('window').width * 0.86, 340);

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
        routes: [{name: screen, params: {fromSideMenu: true}}],
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
      <View style={[styles.iconCircle, {backgroundColor: item.iconBg}]}>
        <Icon name={item.iconName} size={18} color={colors.navy} />
      </View>
      <Text style={styles.rowLabel}>{item.label}</Text>
      <View style={styles.rowRight}>
        {item.trailing ? (
          <Text style={styles.rowTrailing}>{item.trailing}</Text>
        ) : null}
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

export const AppSideMenu: React.FC = () => {
  const {menuVisible, closeMenu} = useAppMenu();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.authToken.user);
  const {data: posInit} = useGetPosInitQuery();
  const [signout] = useSignoutMutation();

  const slideX = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const storeName =
    posInit?.storeSettings?.store_name?.trim() || 'Ananta Restaurant';
  const currency = resolveCurrencySymbol(posInit?.storeSettings?.currency);
  const roleLabel = (user?.role ?? 'waiter').replace(/_/g, ' ');

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
    requestAnimationFrame(() => action());
  };

  const performLogout = async () => {
    try {
      await signout().unwrap();
    } catch {
      // local logout always runs even if network fails.
    } finally {
      dispatch(logout());
    }
  };

  const onLogoutPress = () => {
    closeMenu();
    requestAnimationFrame(() => setLogoutConfirmVisible(true));
  };

  const onLogoutCancel = () => setLogoutConfirmVisible(false);

  const onLogoutConfirm = () => {
    setLogoutConfirmVisible(false);
    void performLogout();
  };

  const comingSoon = (title: string) => {
    Alert.alert(title, 'This feature will be available in a future update.');
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
          label: 'OPS',
          iconName: 'cart',
          iconBg: '#DBEAFE',
          onPress: () =>
            navigate(() =>
              goToTab(navigation, {screen: 'POS', params: {screen: 'PosHome'}}),
            ),
        },
        {
          key: 'orders',
          label: 'Orders',
          iconName: 'receipt',
          iconBg: '#E0E7FF',
          onPress: () => navigate(() => goToTab(navigation, {screen: 'Orders'})),
        }
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
          iconBg: '#DCFCE7',
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
          key: 'inventory',
          label: 'Inventory',
          iconName: 'bar-chart',
          iconBg: '#D1FAE5',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'InventoryList')),
        },
        // {
        //   key: 'add-menu',
        //   label: 'Add menu item',
        //   iconName: 'plus',
        //   iconBg: '#EDE9FE',
        //   onPress: () =>
        //     navigate(() => goToProfileScreen(navigation, 'CreateMenuItem')),
        // },
        // {
        //   key: 'add-inventory',
        //   label: 'Add inventory item',
        //   iconName: 'clipboard',
        //   iconBg: '#DCFCE7',
        //   onPress: () =>
        //     navigate(() =>
        //       goToProfileScreen(navigation, 'AddInventoryItem'),
        //     ),
        // },
        {
          key: 'customer',
          label: 'Customers',
          iconName: 'users',
          iconBg: '#EDE9FE',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'Customers')),
        },
        {
          key: 'printer-settings',
          label: 'Printer settings',
          iconName: 'settings',
          iconBg: '#E0E7FF',
          onPress: () =>
            navigate(() => goToProfileScreen(navigation, 'PrinterSettings')),
        },
      ],
    },
    {
      key: 'account',
      items: [
        // {
        //   key: 'role',
        //   label: 'User role',
        //   iconName: 'users',
        //   iconBg: '#FCE7F3',
        //   trailing: roleLabel,
        //   onPress: () =>
        //     navigate(() => goToProfileScreen(navigation, 'ProfileMain')),
        // },
        // {
        //   key: 'currency',
        //   label: 'Currency',
        //   iconName: 'receipt',
        //   iconBg: '#DCFCE7',
        //   trailing: `(${currency || RUPEE_SYMBOL})`,
        //   onPress: () => {
        //     closeMenu();
        //     Alert.alert('Currency', `Outlet currency: ${currency}`);
        //   },
        // },
        // {
        //   key: 'language',
        //   label: 'Select your language',
        //   iconName: 'globe',
        //   iconBg: '#CCFBF1',
        //   onPress: () => {
        //     closeMenu();
        //     comingSoon('Language');
        //   },
        // },
        // {
        //   key: 'barcode',
        //   label: 'Barcode generator',
        //   iconName: 'menu',
        //   iconBg: '#EDE9FE',
        //   onPress: () => {
        //     closeMenu();
        //     comingSoon('Barcode generator');
        //   },
        // },
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

  return (
    <>
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <Animated.View style={[styles.backdrop, {opacity: fade}]} />
          </Pressable>

          <Animated.View
            style={[styles.drawer, {transform: [{translateX: slideX}]}]}>
            <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <Image
                  source={require('../../assets/logo-dark.png')}
                  style={styles.logo}
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
                      <Text style={styles.sectionTitle}>{section.title}</Text>
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
        icon={<LogOutIcon size={26} color={colors.error} />}
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
    shadowOffset: {width: 4, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerSafe: {flex: 1},
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF9C3',
  },
  headerText: {flex: 1},
  storeName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  storeSub: {
    marginTop: 2,
    fontSize: 14,
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
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconEmoji: {fontSize: 18},
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '38%',
  },
  rowTrailing: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'capitalize',
  },
  chevron: {
    fontSize: 22,
    color: colors.muted,
    fontWeight: '300',
  },
});