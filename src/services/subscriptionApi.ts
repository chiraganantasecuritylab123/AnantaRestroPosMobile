import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export interface PurchaseSubscriptionRequest {
  plan_id: string;
}

export type PurchaseSubscriptionAction = 'free_activated' | 'checkout_ready';

export interface PurchaseSubscriptionResponse {
  success: boolean;
  action?: PurchaseSubscriptionAction;
  message?: string;
  plan?: unknown;
  subscriptionId?: string;
  endsAt?: string;
  planTitle?: string;
  plan_id?: string;
  razorpay_plan_id?: string;
  key?: string;
  mode?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
}

export interface VerifyRazorpaySubscriptionRequest {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
  plan_id: string;
}

export interface VerifyRazorpaySubscriptionResponse {
  success: boolean;
  message?: string;
  subscriptionId?: string;
  endsAt?: string;
  is_subscription_active?: boolean;
}

export const subscriptionApi = createApi({
  reducerPath: 'subscriptionApi',
  baseQuery: baseQueryWithReauthHandling,
  endpoints: builder => ({
    purchaseSubscription: builder.mutation<
      PurchaseSubscriptionResponse,
      PurchaseSubscriptionRequest
    >({
      query: body => ({
        url: '/subscriptions/purchase',
        method: 'POST',
        body,
      }),
    }),
    verifyRazorpaySubscription: builder.mutation<
      VerifyRazorpaySubscriptionResponse,
      VerifyRazorpaySubscriptionRequest
    >({
      query: body => ({
        url: '/payments/razorpay/verify-subscription',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  usePurchaseSubscriptionMutation,
  useVerifyRazorpaySubscriptionMutation,
} = subscriptionApi;
