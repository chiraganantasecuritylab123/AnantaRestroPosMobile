import {Platform, ViewStyle} from 'react-native';
import {moderateScale, verticalScale} from '../utils/responsive';

export const cardShadow: ViewStyle =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: verticalScale(6)},
        shadowOpacity: 0.08,
        shadowRadius: moderateScale(16),
      }
    : {elevation: 4};

export const cardShadowLg: ViewStyle =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: verticalScale(10)},
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(20),
      }
    : {elevation: 6};
