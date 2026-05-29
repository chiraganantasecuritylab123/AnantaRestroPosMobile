/**
 * Waiter Restaurant POS — Ananta
 * @format
 */

import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, useColorScheme, View} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Provider, useSelector} from 'react-redux';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {store, RootState} from './src/store';
import {LoginScreen} from './src/screens/LoginScreen';
import {VerifyOtpScreen} from './src/screens/VerifyOtpScreen';
import {SplashScreen} from './src/screens/SplashScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {PosCheckoutScreen} from './src/screens/PosCheckoutScreen';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {OrdersScreen} from './src/screens/OrdersScreen';
import {ProfileScreen} from './src/screens/ProfileScreen';
import {setAuth} from './src/features/authTokenSlice';
import {useAppDispatch} from './src/useAppHooks';
import {loadAuthFromStorage} from './src/storage/authStorage';
import type {
  AuthStackParamList,
  MainTabParamList,
  PosStackParamList,
  RootStackParamList,
} from './src/navigation/types';
import {PosHomeScreen} from './src/screens/PosHomeScreen';
import {AppTabBarIcon} from './src/components/ui';
import {colors} from './src/theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const PosStack = createNativeStackNavigator<PosStackParamList>();

const TAB_BAR_BASE_HEIGHT = 62;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.white,
    primary: colors.green,
    text: colors.navy,
  },
};

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="Splash">
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </AuthStack.Navigator>
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

function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({focused}) => (
          <AppTabBarIcon
            name={route.name as 'Dashboard' | 'POS' | 'Orders' | 'Profile'}
            focused={focused}
          />
        ),
        tabBarStyle: {
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: tabBarBottomInset,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        },
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="POS"
        component={PosStackNavigator}
        options={{tabBarLabel: 'Sales'}}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const token = useSelector((state: RootState) => state.authToken.value);
  const isDarkMode = useColorScheme() === 'dark';
  const dispatch = useAppDispatch();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadAuthFromStorage();
      if (!mounted) {
        return;
      }
      if (stored?.token) {
        dispatch(setAuth({token: stored.token, user: stored.user as any}));
      }
      setBooting(false);
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <RootStack.Navigator screenOptions={{headerShown: false}}>
          {token ? (
            <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthStackNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
