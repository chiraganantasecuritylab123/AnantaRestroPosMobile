export type CountryDialOption = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  /** Expected national number length (digits only). */
  nationalLength: number;
};

export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = [
  {code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', nationalLength: 10},
  {code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', nationalLength: 10},
  {code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', nationalLength: 10},
  {code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', nationalLength: 9},
  {code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', nationalLength: 9},
  {code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', nationalLength: 9},
  {code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', nationalLength: 10},
  {code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', nationalLength: 10},
];

export const DEFAULT_COUNTRY =
  COUNTRY_DIAL_OPTIONS.find(c => c.code === 'IN') ?? COUNTRY_DIAL_OPTIONS[0];

export function formatNationalPhoneDisplay(
  digits: string,
  nationalLength: number,
): string {
  const d = digits.replace(/\D/g, '').slice(0, nationalLength);
  if (nationalLength === 10 && d.length > 5) {
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }
  if (d.length > 3) {
    return `${d.slice(0, 3)} ${d.slice(3)}`;
  }
  return d;
}

/** Phone payload for auth API (India keeps 10-digit local format). */
export function buildAuthPhone(
  country: CountryDialOption,
  localDigits: string,
): string {
  if (country.dialCode === '+91') {
    return localDigits;
  }
  const code = country.dialCode.replace(/\D/g, '');
  return `${code}${localDigits}`;
}

export function maskAuthPhone(
  country: CountryDialOption,
  localDigits: string,
): string {
  const display = formatNationalPhoneDisplay(localDigits, country.nationalLength);
  return `${country.dialCode} ${display}`.trim();
}
