import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export interface SigninRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  username: string;
  name: string;
  role: string;
  photo: string | null;
  designation: string | null;
  phone: string | null;
  email: string;
  scope: string;
  tenant_id: number;
  is_active: number;
  outlet_id?: number | string;
  outletId?: number | string;
  default_outlet_id?: number | string;
}

export interface SigninResponse {
  success: boolean;
  message: string;
  accessToken: string;
  user: AuthUser;
}

export interface PhoneLoginRequest {
  phone: string;
}

export interface PhoneLoginResponse {
  success: boolean;
  message: string;
  phoneMasked?: string;
  preAuthToken?: string;
  devHint?: string;
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
  accessToken?: string;
  user?: AuthUser;
  outlet_id?: number | string;
  outletId?: number | string;
  code?: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauthHandling,
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
      }),
    }),
    signout: builder.mutation<{message: string} | unknown, void>({
      query: () => ({
        url: '/auth/signout',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useSigninMutation,
  usePhoneLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSignoutMutation,
} = authApi;
