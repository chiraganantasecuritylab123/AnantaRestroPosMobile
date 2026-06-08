import type {NavigatorScreenParams} from '@react-navigation/native';

export type PosStackParamList = {
  PosHome: undefined;
  PosCheckout: undefined;
};

export type SideMenuOriginParams = {
  fromSideMenu?: boolean;
};

export type ProfileStackParamList = {
  ProfileMain: SideMenuOriginParams | undefined;
  CreateMenuItem: undefined;
  MenuItemsList: SideMenuOriginParams | undefined;
  CategoriesList: SideMenuOriginParams | undefined;
  EditMenuItem: {
    menuItemId: string;
    title: string;
    description: string;
    price: string;
    netPrice: string;
    categoryId: string;
    taxId: string;
    image?: string | null;
    automaticInventoryEnabled?: boolean;
  };
  InventoryList: SideMenuOriginParams | undefined;
  AddInventoryItem: undefined;
  EditInventoryItem: {
    itemId: string;
    title: string;
    unit: string;
    minQuantityThreshold: string;
    quantity: string;
    linkedMenuItemId?: string;
    linkedMenuItemTitle?: string;
  };
  PrinterMenu: SideMenuOriginParams | undefined;
  PrinterSettings: SideMenuOriginParams | undefined;
  ContactSupport: undefined;
  Customers: SideMenuOriginParams | undefined;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  POS: NavigatorScreenParams<PosStackParamList>;
  Orders: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type VerifyOtpParams = {
  phone: string;
  phoneMasked: string;
  preAuthToken: string;
  expiresInSec?: number;
  devHint?: string;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  VerifyOtp: VerifyOtpParams;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
