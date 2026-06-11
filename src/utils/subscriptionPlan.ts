import type {SubscriptionPlan} from '../services/authApi';

export function isPaidSubscriptionPlan(plan: SubscriptionPlan): boolean {
  const planType = plan.planType?.toLowerCase() ?? '';
  if (planType === 'free') {
    return false;
  }
  const price = plan.offerPrice > 0 ? plan.offerPrice : plan.amount;
  if (planType === 'paid') {
    return true;
  }
  return price > 0;
}

export function getSubscriptionPlanPrice(plan: SubscriptionPlan): number {
  return plan.offerPrice > 0 ? plan.offerPrice : plan.amount;
}

export function humanizeSubscriptionMessage(message?: string): string {
  if (!message?.trim()) {
    return 'Something went wrong. Please try again.';
  }

  const known: Record<string, string> = {
    free_plan_already_used:
      'You have already used the free plan. Please choose a paid plan.',
    free_plan_activated: 'Your free plan has been activated successfully.',
    subscription_checkout_ready:
      'Complete payment to activate your subscription.',
  };

  return known[message] ?? message.replace(/_/g, ' ');
}

export function buildRazorpayContact(
  phone?: string | null,
  phoneCountryCode?: string | null,
): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const codeDigits = (phoneCountryCode ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  if (codeDigits) {
    return `+${codeDigits}${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}
