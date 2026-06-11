import {StyleSheet, Text, TextInput, TextStyle} from 'react-native';

/**
 * Roboto font family names (must match linked .ttf filenames without extension).
 * Linked via react-native.config.js → assets/fonts/
 */
export const fontFamily = {
  light: 'Roboto-Light',
  regular: 'Roboto-Regular',
  medium: 'Roboto-Medium',
  semiBold: 'Roboto-Medium',
  bold: 'Roboto-Bold',
  black: 'Roboto-Black',
} as const;

/** Default app font — applied globally to Text and TextInput. */
export const defaultFontFamily = fontFamily.regular;

const WEIGHT_TO_FONT: Record<string, string> = {
  '100': fontFamily.light,
  '200': fontFamily.light,
  '300': fontFamily.light,
  '400': fontFamily.regular,
  normal: fontFamily.regular,
  '500': fontFamily.medium,
  '600': fontFamily.medium,
  '700': fontFamily.bold,
  bold: fontFamily.bold,
  '800': fontFamily.black,
  '900': fontFamily.black,
};

/** Map fontWeight to the correct Roboto TTF (required for iOS custom fonts). */
export function fontFamilyForWeight(
  weight?: TextStyle['fontWeight'],
): string {
  if (weight == null) {
    return defaultFontFamily;
  }
  return WEIGHT_TO_FONT[String(weight)] ?? defaultFontFamily;
}

/** Typography helper — returns fontFamily for a weight (prefer over fontWeight alone). */
export function roboto(weight?: TextStyle['fontWeight']): TextStyle {
  return {fontFamily: fontFamilyForWeight(weight)};
}

/** Base text style with Roboto regular. */
export const baseTextStyle: TextStyle = {
  fontFamily: defaultFontFamily,
};

/**
 * Applies Roboto globally to all Text and TextInput components.
 * Call once at app entry (index.js) before AppRegistry.
 */
export function applyGlobalFont(): void {
  const defaultStyle: TextStyle = {fontFamily: defaultFontFamily};

  type WithDefaults = {
    defaultProps?: {style?: TextStyle | TextStyle[]; allowFontScaling?: boolean};
  };

  const textComponent = Text as typeof Text & WithDefaults;
  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    allowFontScaling: false,
    style: StyleSheet.flatten([
      defaultStyle,
      textComponent.defaultProps?.style,
    ]),
  };

  const inputComponent = TextInput as typeof TextInput & WithDefaults;
  inputComponent.defaultProps = {
    ...inputComponent.defaultProps,
    allowFontScaling: false,
    style: StyleSheet.flatten([
      defaultStyle,
      inputComponent.defaultProps?.style,
    ]),
  };
}
