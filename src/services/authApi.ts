import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';
import {isStructuredClientError} from '../utils/apiError';

export interface SigninRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  username: string;
  name: string;
  role: string;
  photo: string | null;
  designation?: string | null;
  phone: string | null;
  phone_country_code?: string | null;
  phone_verified?: boolean;
  email: string;
  scope: string;
  tenant_id: string | number;
  id?: string;
  is_active: number;
  outlet_id?: number | string;
  outletId?: number | string;
  default_outlet_id?: number | string;
  subscription_end?: string | null;
  subscription_id?: string | null;
  is_free_plan_used?: boolean;
  business_type?: string;
  signup_source?: string;
  is_subscription_active?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  packageName: string;
  planType: string;
  packageType: string;
  currency: string;
  amount: number;
  offerPrice: number;
  durationDays: number;
  isRecommended: boolean;
  selectedModules: string[];
  additionalFeatures: string[];
}

export interface PlansResponse {
  success: boolean;
  plans: SubscriptionPlan[];
}

export interface SubscriptionBillingEntry {
  id: string;
  invoiceId: string;
  date: string;
  plan: string;
  amount: number;
  status: string;
  displayKind: string;
}

export interface SubscriptionUsageSummary {
  outletsUsed: number;
  outletsLimit: number | null;
  usersUsed: number;
  usersLimit: number | null;
  ordersThisMonth: number;
}

export interface SubscriptionDetails {
  id: string;
  is_active: number;
  subscription_id: string | null;
  payment_customer_id: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  planName: string | null;
  planCurrency: string | null;
  planAmount: number | null;
  planType: string | null;
  planDurationDays: number | null;
  planSelectedModules: string[] | null;
  planAiTokenLimit: number | null;
  monthlyPlan: unknown;
  annualPlan: unknown;
  subscriptionRow: unknown;
  billingHistory: SubscriptionBillingEntry[];
  usageSummary: SubscriptionUsageSummary | null;
}

export interface CancelSubscriptionRequest {
  id: string;
  subscriptionId: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  is_subscription_active: boolean;
}

export interface SigninResponse {
  success: boolean;
  message: string;
  accessToken: string;
  user: AuthUser;
}

export type AuthFlow = 'login' | 'register';

export interface OtpPolicy {
  maxVerifyAttempts?: number;
  lockoutMinutes?: number;
  sendMaxPerWindow?: number;
  sendWindowMinutes?: number;
  expiryMinutes?: number;
  msg91Enabled?: boolean;
  staticMode?: boolean;
  exposeDevHint?: boolean;
  staticOtpCode?: string;
  deliveryMode?: string;
  environment?: string;
}

export interface PhoneLoginRequest {
  phone: string;
  phone_country_code: string;
}

export interface PhoneLoginResponse {
  success: boolean;
  flow?: AuthFlow;
  isNewUser?: boolean;
  message: string;
  phoneMasked?: string;
  preAuthToken?: string;
  devHint?: string;
  deliveryMode?: string;
  requiresPhoneVerification?: boolean;
  otpPolicy?: OtpPolicy;
}

export interface SendOtpRequest {
  preAuthToken: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phoneMasked?: string;
  expiresInSec?: number;
  devHint?: string;
}

export interface VerifyOtpRequest {
  otp: string;
  preAuthToken: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  flow?: AuthFlow;
  accessToken?: string;
  preAuthToken?: string;
  user?: AuthUser;
  outlet_id?: number | string;
  outletId?: number | string;
  code?: string;
  attemptsRemaining?: number;
}

export type SignupBusinessType = 'dine_in' | 'takeaway' | 'both';

export interface SignupCompleteRequest {
  preAuthToken: string;
  biz_name: string;
  email: string;
  business_type: SignupBusinessType;
}

export interface SignupCompleteResponse {
  success: boolean;
  message: string;
  requiresApproval?: boolean;
  redirectTo?: string;
  accessToken?: string;
  user?: AuthUser;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['SubscriptionDetails'],
  endpoints: builder => ({
    signin: builder.mutation<SigninResponse, SigninRequest>({
      query: body => ({
        url: '/auth/signin',
        method: 'POST',
        body,
      }),
    }),
    phoneLogin: builder.mutation<PhoneLoginResponse, PhoneLoginRequest>({
      query: body => ({
        url: '/auth/phone/login',
        method: 'POST',
        body,
      }),
    }),
    sendOtp: builder.mutation<SendOtpResponse, SendOtpRequest>({
      query: body => ({
        url: '/auth/otp/send',
        method: 'POST',
        body,
      }),
    }),
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: body => ({
        url: '/auth/otp/verify',
        method: 'POST',
        body,
        validateStatus: (
          response: {status: number},
          result: unknown,
        ) =>
          (response.status >= 200 && response.status < 300) ||
          isStructuredClientError(response.status, result),
      }),
    }),
    signupComplete: builder.mutation<SignupCompleteResponse, SignupCompleteRequest>({
      query: body => ({
        url: '/auth/signup/complete',
        method: 'POST',
        body,
      }),
    }),
    signout: builder.mutation<{message: string} | unknown, void>({
      query: () => ({
        url: '/auth/signout',
        method: 'POST',
      }),
    }),
    getPlans: builder.query<PlansResponse, {lang?: string} | void>({
      query: (params = {}) => ({
        url: '/auth/plans',
        params: {lang: params?.lang ?? 'en'},
      }),
    }),
    getSubscriptionDetails: builder.query<
      SubscriptionDetails,
      {lang?: string} | void
    >({
      query: (params = {}) => ({
        url: '/auth/subscription-details',
        params: {lang: params?.lang ?? 'en'},
      }),
      providesTags: ['SubscriptionDetails'],
    }),
    cancelSubscription: builder.mutation<
      CancelSubscriptionResponse,
      CancelSubscriptionRequest
    >({
      query: body => ({
        url: '/auth/cancel-subscription',
        method: 'POST',
        params: {lang: 'en'},
        body,
      }),
      invalidatesTags: ['SubscriptionDetails'],
    }),
  }),
});

export const {
  useSigninMutation,
  usePhoneLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSignupCompleteMutation,
  useSignoutMutation,
  useGetPlansQuery,
  useGetSubscriptionDetailsQuery,
  useCancelSubscriptionMutation,
} = authApi;
