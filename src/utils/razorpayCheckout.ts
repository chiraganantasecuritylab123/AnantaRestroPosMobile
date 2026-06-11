import RazorpayCheckout from 'react-native-razorpay';
import {colors} from '../theme/colors';

export type RazorpaySubscriptionCheckoutInput = {
  key: string;
  subscriptionId: string;
  planName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  currency?: string;
};

export async function openRazorpaySubscriptionCheckout(
  input: RazorpaySubscriptionCheckoutInput,
) {
  return RazorpayCheckout.open({
    key: input.key,
    subscription_id: input.subscriptionId,
    name: 'Ananta POS',
    description: input.planName,
    currency: input.currency ?? 'INR',
    prefill: {
      name: input.customerName ?? '',
      email: input.customerEmail ?? '',
      contact: input.customerPhone ?? '',
    },
    theme: {color: colors.green},
  });
}

export function isRazorpayUserCancelled(error: unknown): boolean {
  const code = (error as {code?: number})?.code;
  return code === 0 || code === 2;
}

export function getRazorpayErrorMessage(error: unknown): string {
  const description = (error as {description?: string})?.description?.trim();
  if (description) {
    return description;
  }
  return 'Payment could not be completed. Please try again.';
}
