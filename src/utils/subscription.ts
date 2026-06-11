import type {AuthUser} from '../services/authApi';

/** True when the user may access the main app (dashboard, POS, etc.). */
export function isSubscriptionActive(
  user: AuthUser | null | undefined,
): boolean {
  if (!user) {
    return false;
  }
  if (user.is_subscription_active === undefined) {
    return true;
  }
  return user.is_subscription_active === true;
}
