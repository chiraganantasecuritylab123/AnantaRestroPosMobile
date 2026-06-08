/** Indian Rupee symbol used across the POS app. */
export const RUPEE_SYMBOL = '₹';

const INR_ALIASES = new Set([
  'inr',
  'rs',
  'rs.',
  're',
  're.',
  'rupee',
  'rupees',
  'indian rupee',
  'indian rupees',
  '₹',
]);

/**
 * Normalizes API/store `currency` values (e.g. "INR") to a display symbol (₹).
 */
export function resolveCurrencySymbol(
  currency: string | null | undefined,
): string {
  const raw = (currency ?? '').trim();
  if (!raw) {
    return RUPEE_SYMBOL;
  }
  if (INR_ALIASES.has(raw.toLowerCase())) {
    return RUPEE_SYMBOL;
  }
  if (raw === RUPEE_SYMBOL) {
    return RUPEE_SYMBOL;
  }
  const lower = raw.toLowerCase();
  if (lower === 'usd') {
    return '$';
  }
  if (lower === 'eur') {
    return '€';
  }
  if (lower === 'gbp') {
    return '£';
  }
  if (raw.length <= 2) {
    return raw;
  }
  return RUPEE_SYMBOL;
}

/** e.g. `₹ 1,234.50` */
export function formatMoney(
  amount: number,
  currency?: string | null,
  decimals = 2,
): string {
  const sym = resolveCurrencySymbol(currency);
  return `${sym} ${amount.toFixed(decimals)}`;
}
