import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {ChevronRightIcon} from './icons';
import {colors, radii, spacing, typography} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  showArrow?: boolean;
  /** Override gradient; use two stops or repeat one color for a solid fill. */
  gradientColors?: readonly [string, string, ...string[]];
};

export const GradientButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  style,
  showArrow = true,
  gradientColors,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.88}
    style={[styles.wrap, style, (disabled || loading) && styles.dim]}>
    <LinearGradient
      colors={
        gradientColors ? [...gradientColors] : [...colors.gradientGreen]
      }
      start={{x: 0, y: 0.5}}
      end={{x: 1, y: 0.5}}
      style={styles.gradient}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.labelRow}>
          <Text style={styles.text}>{title}</Text>
          {showArrow ? (
            <ChevronRightIcon
              size={moderateScale(18)}
              color={colors.white}
              strokeWidth={2.5}
            />
          ) : null}
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  dim: {opacity: 0.6},
  gradient: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  text: {
    ...typography.button,
  },
});
