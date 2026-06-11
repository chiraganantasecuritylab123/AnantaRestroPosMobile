/**
 * Responsive layout utilities built on react-native-size-matters.
 *
 * ─── CHANGE UI SIZE APP-WIDE ───────────────────────────────────────────────
 * Edit `GLOBAL_RESPONSIVE` below. Every screen/component that uses
 * `scale`, `verticalScale`, or `moderateScale` (including theme spacing,
 * typography, and shadows) will follow these values after reload.
 *
 * Guideline:
 * - scale() / rw()         → horizontal (width, paddingHorizontal, gap)
 * - verticalScale() / rh() → vertical (height, paddingVertical, lineHeight)
 * - moderateScale() / rm() → fonts, border radii, icon sizes
 */
import {Dimensions, ScaledSize, useWindowDimensions} from 'react-native';
import {useMemo} from 'react';
import {
  scale as baseScale,
  verticalScale as baseVerticalScale,
  moderateScale as baseModerateScale,
} from 'react-native-size-matters';

// ─── Global responsive config (single source of truth) ─────────────────────

export type GlobalResponsiveConfig = {
  /** Multiply all horizontal sizes (width, paddingHorizontal, marginLeft…). */
  width: number;
  /** Multiply all vertical sizes (height, paddingVertical, lineHeight…). */
  height: number;
  /** Multiply fonts, radii, icons (moderateScale). */
  moderate: number;
  /** moderateScale damping 0–1. Lower = less growth on large screens. */
  moderateDamping: number;

  /** Brand logo: share of screen width (0–1). */
  logoWidthRatio: number;
  /** Brand logo: height as fraction of logo width. */
  logoHeightRatio: number;
  logoMaxWidthPhone: number;
  logoMaxWidthTablet: number;

  tabletMinShortSide: number;
  tabletMaxContentWidth: number;
  tabletMaxPosWidth: number;
};

/**
 * Global variables — adjust `width` / `height` / `moderate` to resize the
 * entire app. Example: `width: 1.1` makes all horizontal dimensions 10% larger.
 */
export const GLOBAL_RESPONSIVE: GlobalResponsiveConfig = {
  width: 1,
  height: .9,
  moderate: .99,
  moderateDamping: 0.1,

  logoWidthRatio: 0.72,
  logoHeightRatio: 0.55,
  logoMaxWidthPhone: 300,
  logoMaxWidthTablet: 320,

  tabletMinShortSide: 600,
  tabletMaxContentWidth: 560,
  tabletMaxPosWidth: 900,
};

/** Override global responsive values at runtime (requires reload for theme tokens computed at import). */
export function setGlobalResponsive(
  overrides: Partial<GlobalResponsiveConfig>,
): GlobalResponsiveConfig {
  Object.assign(GLOBAL_RESPONSIVE, overrides);
  return GLOBAL_RESPONSIVE;
}

// ─── Scale helpers (all pass through GLOBAL_RESPONSIVE) ────────────────────

/** Horizontal scale — widths, horizontal padding/margin, row gaps. */
export function scale(size: number): number {
  return baseScale(size) * GLOBAL_RESPONSIVE.width;
}

/** Vertical scale — heights, vertical padding/margin, line heights. */
export function verticalScale(size: number): number {
  return baseVerticalScale(size) * GLOBAL_RESPONSIVE.height;
}

/** Moderate scale — fontSize, borderRadius, icon sizes. */
export function moderateScale(size: number, factor?: number): number {
  const damping = factor ?? GLOBAL_RESPONSIVE.moderateDamping;
  return baseModerateScale(size, damping) * GLOBAL_RESPONSIVE.moderate;
}

/** Shorthand aliases. */
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
/** Semantic aliases: responsive width / height / moderate. */
export const rw = scale;
export const rh = verticalScale;
export const rm = moderateScale;

// ─── Layout constants (read from GLOBAL_RESPONSIVE) ───────────────────────

export const TABLET_MIN_SHORT_SIDE = GLOBAL_RESPONSIVE.tabletMinShortSide;
export const TABLET_MAX_CONTENT_WIDTH = GLOBAL_RESPONSIVE.tabletMaxContentWidth;
export const TABLET_MAX_POS_WIDTH = GLOBAL_RESPONSIVE.tabletMaxPosWidth;

export const BRAND_LOGO_HEIGHT_RATIO = GLOBAL_RESPONSIVE.logoHeightRatio;
export const BRAND_LOGO_WIDTH_RATIO = GLOBAL_RESPONSIVE.logoWidthRatio;
export const BRAND_LOGO_MAX_WIDTH_PHONE = GLOBAL_RESPONSIVE.logoMaxWidthPhone;
export const BRAND_LOGO_MAX_WIDTH_TABLET = GLOBAL_RESPONSIVE.logoMaxWidthTablet;

export type ScreenDimensions = {
  width: number;
  height: number;
  shortSide: number;
  longSide: number;
};

export function getScreenDimensions(): ScreenDimensions {
  const {width, height} = Dimensions.get('window');
  return {
    width,
    height,
    shortSide: Math.min(width, height),
    longSide: Math.max(width, height),
  };
}

export function isTablet(window?: ScaledSize): boolean {
  const {width, height} = window ?? Dimensions.get('window');
  return Math.min(width, height) >= GLOBAL_RESPONSIVE.tabletMinShortSide;
}

export function isLandscape(window?: ScaledSize): boolean {
  const {width, height} = window ?? Dimensions.get('window');
  return width > height;
}

export function windowWidth(): number {
  return Dimensions.get('window').width;
}

export function windowHeight(): number {
  return Dimensions.get('window').height;
}

export function contentHorizontalPadding(): number {
  return isTablet() ? scale(32) : scale(20);
}

export function maxContentWidth(
  tabletMax = GLOBAL_RESPONSIVE.tabletMaxContentWidth,
): number {
  const {width} = Dimensions.get('window');
  return isTablet() ? Math.min(scale(tabletMax), width) : width;
}

export function gridColumnCount(
  itemMinWidth: number,
  maxColumns = 4,
): number {
  const {width} = Dimensions.get('window');
  const horizontalPad = contentHorizontalPadding() * 2;
  const available = width - horizontalPad;
  const cols = Math.floor(available / scale(itemMinWidth));
  return Math.max(2, Math.min(maxColumns, cols));
}

export function brandLogoWidth(screenWidth: number): number {
  const cap = isTablet()
    ? scale(GLOBAL_RESPONSIVE.logoMaxWidthTablet)
    : scale(GLOBAL_RESPONSIVE.logoMaxWidthPhone);
  return Math.min(screenWidth * GLOBAL_RESPONSIVE.logoWidthRatio, cap);
}

export function brandLogoSize(screenWidth: number): {
  width: number;
  height: number;
} {
  const width = brandLogoWidth(screenWidth);
  return {width, height: width * GLOBAL_RESPONSIVE.logoHeightRatio};
}

export function useBrandLogoSize(): {width: number; height: number} {
  const {width: screenW} = useWindowDimensions();
  return useMemo(() => brandLogoSize(screenW), [screenW]);
}

export function useResponsiveLayout() {
  const window = useWindowDimensions();
  const tablet = isTablet(window);
  const landscape = isLandscape(window);

  return {
    window,
    isTablet: tablet,
    isLandscape: landscape,
    global: GLOBAL_RESPONSIVE,
    contentPadding: tablet ? scale(32) : scale(20),
    maxContentWidth: tablet
      ? Math.min(scale(GLOBAL_RESPONSIVE.tabletMaxContentWidth), window.width)
      : window.width,
    maxPosWidth: tablet
      ? Math.min(scale(GLOBAL_RESPONSIVE.tabletMaxPosWidth), window.width)
      : window.width,
  };
}
