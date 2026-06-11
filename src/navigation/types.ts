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
  TaxesList: SideMenuOriginParams | undefined;
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
  InventoryDetail: {
    itemId: string;
    title: string;
    unit: string;
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

export type SalesOrdersParams = {
  fromSideMenu?: boolean;
  fromProfile?: boolean;
};

export type OrdersStackParamList = {
  OrdersMain: undefined;
  SalesOrders: SalesOrdersParams | undefined;
};

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  POS: NavigatorScreenParams<PosStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type VerifyOtpParams = {
  phone: string;
  phoneCountryCode: string;
  phoneMasked: string;
  preAuthToken: string;
  flow: 'login' | 'register';
  expiresInSec?: number;
  devHint?: string;
};

export type SignupCompleteParams = {
  preAuthToken: string;
  phoneMasked: string;
};

export type AccountPendingApprovalParams = {
  message: string;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  VerifyOtp: VerifyOtpParams;
  SignupComplete: SignupCompleteParams;
  AccountPendingApproval: AccountPendingApprovalParams;
};

export type RootStackParamList = {
  Auth: undefined;
  Subscription: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
