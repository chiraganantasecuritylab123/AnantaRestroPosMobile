import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import {ChevronLeftIcon} from './icons';
import {cardShadow, colors, radii, spacing, typography} from '../../theme';

const SIDE_MIN_W = 72;

export type TopHeaderProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  onBack?: () => void;
  /** When false, left slot is empty (e.g. tab root screens). Default: true if `onBack` is set. */
  showBack?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export type TopHeaderActionProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export const TopHeaderAction: React.FC<TopHeaderActionProps> = ({
  label,
  onPress,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
    activeOpacity={0.85}
    accessibilityLabel={accessibilityLabel ?? label}>
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  kicker,
  onBack,
  showBack,
  right,
  style,
}) => {
  const showLeft = showBack ?? Boolean(onBack);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.side}>
        {showLeft && onBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            accessibilityLabel="Go back"
            activeOpacity={0.85}>
            <ChevronLeftIcon size={22} color={colors.navy} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.center}>
        {kicker ? (
          <Text style={styles.kicker} numberOfLines={1}>
            {kicker}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideRight]}>{right ?? null}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    minHeight: 60,
  },
  side: {
    minWidth: SIDE_MIN_W,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    ...typography.hero,
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
    textAlign: 'right',
  },
});
