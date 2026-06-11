export type SubscriptionInactivePayload = {
  success?: boolean;
  message?: string;
  is_subscription?: boolean;
  code?: string;
};

const SUBSCRIPTION_SKIP_PATHS = [
  '/auth/plans',
  '/auth/subscription-details',
  '/auth/cancel-subscription',
  '/subscriptions/purchase',
  '/payments/razorpay/verify-subscription',
  '/auth/signout',
  '/auth/otp/',
  '/auth/phone/login',
  '/auth/signup/',
] as const;

export function shouldSkipSubscriptionCheck(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return SUBSCRIPTION_SKIP_PATHS.some(prefix => path.includes(prefix));
}

export function parseSubscriptionInactive(
  data: unknown,
): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const body = data as SubscriptionInactivePayload;
  const inactive =
    body.is_subscription === false || body.code === 'SUBSCRIPTION_INACTIVE';
  if (!inactive) {
    return null;
  }
  return (
    body.message?.trim() ||
    'Your subscription is inactive. Please subscribe to continue.'
  );
}
