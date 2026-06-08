export const colors = {
  background: '#F9F9F9',
  card: '#FFFFFF',
  navy: '#1A2B48',
  navySoft: '#2D3F5C',
  orange: '#FF7A00',
  orangeLight: '#FF9F3A',
  green: '#16A34A',
  greenDark: '#15803D',
  muted: '#6B7280',
  mutedLight: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  error: '#DC2626',
  errorBg: 'rgba(220,38,38,0.08)',
  white: '#FFFFFF',
  black: '#111827',
  purple: '#7C3AED',
  blue: '#2563EB',
  cream: '#F5F2E9',
  tabInactive: '#9CA3AF',
  tabActive: '#16A34A',
  gradientOrange: ['#FF8A00', '#FF9F3A'] as const,
  gradientGreen: ['#16A34A', '#15803D'] as const,
  gradientCta: ['#FF7A00', '#16A34A'] as const,
  gradientHero: ['#15803D', '#16A34A', '#22C55E'] as const,
};

const HEX_COLOR_REGEX = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;

function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    const [_, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shiftHex(hex: string, amount: number): string {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return hex;
  }

  const raw = normalized.replace('#', '');
  const r = clamp(parseInt(raw.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(raw.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(raw.slice(4, 6), 16) + amount);

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

export function applyBrandingColors(
  primaryColor?: string | null,
  secondaryColor?: string | null,
) {
  const primary = primaryColor ? normalizeHex(primaryColor) : null;
  const secondary = secondaryColor ? normalizeHex(secondaryColor) : null;

  if (!primary && !secondary) {
    return false;
  }

  if (primary) {
    colors.green = primary;
    colors.greenDark = shiftHex(primary, -30);
    colors.tabActive = primary;
    colors.blue = primary;
    colors.gradientGreen = [shiftHex(primary, -30), primary] as const;
    colors.gradientHero = [
      shiftHex(primary, -40),
      shiftHex(primary, -20),
      shiftHex(primary, 20),
    ] as const;
  }

  if (secondary) {
    colors.orange = secondary;
    colors.orangeLight = shiftHex(secondary, 25);
    colors.gradientOrange = [secondary, shiftHex(secondary, 25)] as const;
  }

  if (primary && secondary) {
    colors.gradientCta = [secondary, primary] as const;
  } else if (primary) {
    colors.gradientCta = [colors.orange, primary] as const;
  } else if (secondary) {
    colors.gradientCta = [secondary, colors.green] as const;
  }

  return true;
}

/** Primary brand colors from API config, falling back to themed `colors`. */
export function getBrandHeroColors(
  branding?: {primary_color?: string | null} | null,
) {
  const normalized = branding?.primary_color
    ? normalizeHex(branding.primary_color)
    : null;
  const hero = normalized ?? colors.green;
  const heroDark = normalized ? shiftHex(normalized, -30) : colors.greenDark;
  return {hero, heroDark};
}
