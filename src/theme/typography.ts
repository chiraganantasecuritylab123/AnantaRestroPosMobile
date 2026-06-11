import {TextStyle} from 'react-native';
import {colors} from './colors';
import {fontFamily} from './fonts';
import {moderateScale, verticalScale} from '../utils/responsive';

export const typography = {
  hero: {
    fontSize: moderateScale(28),
    fontFamily: fontFamily.black,
    color: colors.navy,
    letterSpacing: -0.5,
  } as TextStyle,
  title: {
    fontSize: moderateScale(22),
    fontFamily: fontFamily.bold,
    color: colors.navy,
  } as TextStyle,
  subtitle: {
    fontSize: moderateScale(16),
    fontFamily: fontFamily.medium,
    color: colors.navy,
  } as TextStyle,
  body: {
    fontSize: moderateScale(15),
    fontFamily: fontFamily.regular,
    color: colors.muted,
    lineHeight: verticalScale(22),
  } as TextStyle,
  caption: {
    fontSize: moderateScale(13),
    fontFamily: fontFamily.medium,
    color: colors.muted,
  } as TextStyle,
  label: {
    fontSize: moderateScale(13),
    fontFamily: fontFamily.bold,
    color: colors.navy,
  } as TextStyle,
  button: {
    fontSize: moderateScale(16),
    fontFamily: fontFamily.bold,
    color: colors.white,
  } as TextStyle,
};
