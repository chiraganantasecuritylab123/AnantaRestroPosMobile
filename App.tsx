/**
 * Waiter Restaurant POS — Ananta
 * @format
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme, View} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Provider, useSelector} from 'react-redux';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {store, RootState} from './src/store';
import {LoginScreen} from './src/screens/LoginScreen';
import {VerifyOtpScreen} from './src/screens/VerifyOtpScreen';
import {
  SplashContent,
  SplashScreen,
  SPLASH_MIN_MS,
} from './src/screens/SplashScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {PosCheckoutScreen} from './src/screens/PosCheckoutScreen';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {OrdersScreen} from './src/screens/OrdersScreen';
import {ProfileScreen} from './src/screens/ProfileScreen';
import {setAuth, setOutletId} from './src/features/authTokenSlice';
import {useAppDispatch} from './src/useAppHooks';
import {loadAuthFromStorage} from './src/storage/authStorage';
import {isOnboardingComplete} from './src/storage/appStorage';
import type {
  AuthStackParamList,
  DashboardStackParamList,
  MainTabParamList,
  PosStackParamList,
  ProfileStackParamList,
  RootStackParamList,
} from './src/navigation/types';
import {NotificationsScreen} from './src/screens/NotificationsScreen';
import {PosHomeScreen} from './src/screens/PosHomeScreen';
import {CreateMenuItemScreen} from './src/screens/CreateMenuItemScreen';
import {MenuItemsListScreen} from './src/screens/MenuItemsListScreen';
import {EditMenuItemScreen} from './src/screens/EditMenuItemScreen';
import {InventoryListScreen} from './src/screens/InventoryListScreen';
import {AddInventoryItemScreen} from './src/screens/AddInventoryItemScreen';
import {EditInventoryItemScreen} from './src/screens/EditInventoryItemScreen';
import {PrinterMenuScreen} from './src/screens/PrinterMenuScreen';
import {PrinterSettingsScreen} from './src/screens/PrinterSettingsScreen';
import {PrinterBootstrap} from './src/components/PrinterBootstrap';
import {FcmBootstrap} from './src/components/FcmBootstrap';
import {AppSideMenu} from './src/components/navigation/AppSideMenu';
import {AppMenuProvider} from './src/context/AppMenuContext';
import {AppTabBarIcon} from './src/components/ui';
import {colors} from './src/theme';
import {useGetConfigQuery} from './src/services/configApi';
import {applyBrandingColors} from './src/theme/colors';
import {AppConfigGate} from './src/components/AppConfigGate';
import {ContactSupportScreen} from './src/screens/ContactSupportScreen';
import {CustomersScreen} from './src/screens/CustomersScreen';
import {CategoriesListScreen} from './src/screens/CategoriesListScreen';
import {NetworkStatusBanner} from './src/components/NetworkStatusBanner';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const PosStack = createNativeStackNavigator<PosStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const TAB_BAR_BASE_HEIGHT = 62;

type AuthInitialRoute = 'Login' | 'Onboarding';

function AuthStackNavigator({
  initialRouteName,
}: {
  initialRouteName: AuthInitialRoute;
}) {
  return (
    <AuthStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={initialRouteName}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </AuthStack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{headerShown: false}}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </DashboardStack.Navigator>
  );
}

function PosStackNavigator() {
  return (
    <PosStack.Navigator screenOptions={{headerShown: false}}>
      <PosStack.Screen name="PosHome" component={PosHomeScreen} />
      <PosStack.Screen name="PosCheckout" component={PosCheckoutScreen} />
    </PosStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{headerShown: false}}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen
        name="CreateMenuItem"
        component={CreateMenuItemScreen}
      />
      <ProfileStack.Screen
        name="MenuItemsList"
        component={MenuItemsListScreen}
      />
      <ProfileStack.Screen
        name="CategoriesList"
        component={CategoriesListScreen}
      />
      <ProfileStack.Screen name="EditMenuItem" component={EditMenuItemScreen} />
      <ProfileStack.Screen name="InventoryList" component={InventoryListScreen} />
      <ProfileStack.Screen
        name="AddInventoryItem"
        component={AddInventoryItemScreen}
      />
      <ProfileStack.Screen
        name="EditInventoryItem"
        component={EditInventoryItemScreen}
      />
      <ProfileStack.Screen name="PrinterMenu" component={PrinterMenuScreen} />
      <ProfileStack.Screen
        name="PrinterSettings"
        component={PrinterSettingsScreen}
      />
      <ProfileStack.Screen
        name="ContactSupport"
        component={ContactSupportScreen}
      />
      <ProfileStack.Screen name="Customers" component={CustomersScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, 8);

  return (
    <AppMenuProvider>
      <PrinterBootstrap />
      <FcmBootstrap />
      <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarShowLabel: false,
        tabBarIcon: ({focused}) => (
          <AppTabBarIcon
            name={route.name as 'Dashboard' | 'POS' | 'Orders' | 'Profile'}
            focused={focused}
          />
        ),
        tabBarStyle: {
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingTop: 10,
          paddingBottom: tabBarBottomInset,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{tabBarLabel: ''}}
      />
      <Tab.Screen
        name="POS"
        component={PosStackNavigator}
        options={{
          tabBarLabel: '',
          tabBarStyle: {display: 'none'},
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Profile', {
              state: {
                routes: [{name: 'ProfileMain'}],
                index: 0,
              },
            });
          },
        })}
      />
    </Tab.Navigator>
      <AppSideMenu />
    </AppMenuProvider>
  );
}

function RootNavigator() {
  const token = useSelector((state: RootState) => state.authToken.value);
  const isDarkMode = useColorScheme() === 'dark';
  const dispatch = useAppDispatch();
  const [booting, setBooting] = useState(true);
  const [authInitialRoute, setAuthInitialRoute] =
    useState<AuthInitialRoute>('Login');
  const [themeVersion, setThemeVersion] = useState(0);
  const {data: appConfig} = useGetConfigQuery();

  useEffect(() => {
    const branding = appConfig?.data?.branding;
    const changed = applyBrandingColors(
      branding?.primary_color,
      branding?.secondary_color,
    );
    if (changed) {
      setThemeVersion(prev => prev + 1);
    }
  }, [appConfig]);

  const navigationTheme = React.useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.white,
        primary: colors.green,
        text: colors.navy,
      },
    }),
    [themeVersion],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const started = Date.now();
      const [stored, onboardingDone] = await Promise.all([
        loadAuthFromStorage(),
        isOnboardingComplete(),
      ]);
      const remaining = SPLASH_MIN_MS - (Date.now() - started);
      if (remaining > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, remaining));
      }
      if (!mounted) {
        return;
      }
      if (stored?.token) {
        dispatch(setAuth({token: stored.token, user: stored.user as any}));
        if (stored.outletId) {
          dispatch(setOutletId(stored.outletId));
        }
      } else {
        setAuthInitialRoute(onboardingDone ? 'Login' : 'Onboarding');
      }
      setBooting(false);
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  if (booting) {
    return (
      <>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SplashContent />
      </>
    );
  }

  return (
    <AppConfigGate booting={false}>
      <>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer theme={navigationTheme}>
          <RootStack.Navigator screenOptions={{headerShown: false}}>
            {token ? (
              <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
            ) : (
              <RootStack.Screen name="Auth">
                {() => (
                  <AuthStackNavigator initialRouteName={authInitialRoute} />
                )}
              </RootStack.Screen>
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </>
    </AppConfigGate>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <View style={{flex: 1}}>
          <RootNavigator />
          <NetworkStatusBanner />
        </View>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
