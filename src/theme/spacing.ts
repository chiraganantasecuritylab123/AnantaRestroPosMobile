import {moderateScale, GLOBAL_RESPONSIVE} from '../utils/responsive';

const d = GLOBAL_RESPONSIVE.moderateDamping;

export const spacing = {
  xs: moderateScale(4, d),
  sm: moderateScale(8, d),
  md: moderateScale(12, d),
  lg: moderateScale(16, d),
  xl: moderateScale(20, d),
  xxl: moderateScale(24, d),
  xxxl: moderateScale(32, d),
};

export const radii = {
  sm: moderateScale(8, d),
  md: moderateScale(12, d),
  lg: moderateScale(16, d),
  xl: moderateScale(20, d),
  xxl: moderateScale(24, d),
  pill: 999,
};
