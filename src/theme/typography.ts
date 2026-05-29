import {TextStyle} from 'react-native';
import {colors} from './colors';

export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
  } as TextStyle,
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
  } as TextStyle,
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  } as TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.muted,
    lineHeight: 22,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  } as TextStyle,
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  } as TextStyle,
  button: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  } as TextStyle,
};
