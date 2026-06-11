import React from 'react';
import {StyleSheet, Text, TouchableOpacity, ViewStyle} from 'react-native';
import {colors, radii, spacing} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export const Chip: React.FC<Props> = ({label, selected, onPress, style}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.85}
    style={[
      styles.chip,
      selected && styles.chipSelected,
      style,
    ]}>
    <Text style={[styles.label, selected && styles.labelSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: verticalScale(10),
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: scale(8),
    minHeight: verticalScale(40),
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.navy,
  },
  labelSelected: {
    color: colors.white,
  },
});
