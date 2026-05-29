import type {NavigatorScreenParams} from '@react-navigation/native';

export type PosStackParamList = {
  PosHome: undefined;
  PosCheckout: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  POS: NavigatorScreenParams<PosStackParamList>;
  Orders: undefined;
  Profile: undefined;
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
  MainTabs: undefined;
};
