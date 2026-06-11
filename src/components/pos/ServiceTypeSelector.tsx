import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {Circle, Line, Path, Rect} from 'react-native-svg';
import type {DeliveryType} from '../../features/cartSlice';
import {CheckIcon} from '../ui';
import {colors, radii, spacing} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

const STROKE = moderateScale(2);
const DEFAULT_ICON_SIZE = moderateScale(28);
const MENU_ICON_SIZE = moderateScale(22);

type IconProps = {color: string; size: number};

function DineInIcon({color, size}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10h16v2H4zM6 6h2v8H6zM16 6h2v8h-2z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 20h8" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

function TakeawayIcon({color, size}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 8h8l-1 11H9L8 8z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M9 8V6a3 3 0 116 0v2"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DeliveryIcon({color, size}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6.5} cy={17.5} r={2} stroke={color} strokeWidth={STROKE} />
      <Circle cx={17.5} cy={17.5} r={2} stroke={color} strokeWidth={STROKE} />
      <Path
        d="M4 12h2l2-6h8l2 6h2"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Line x1={6} y1="12" x2="18" y2="12" stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}

const OPTIONS: {
  key: DeliveryType;
  label: string;
  Icon: React.FC<IconProps>;
}[] = [
  {key: 'dinein', label: 'Dine-in', Icon: DineInIcon},
  {key: 'takeaway', label: 'Takeaway', Icon: TakeawayIcon},
  {key: 'delivery', label: 'Delivery', Icon: DeliveryIcon},
];

type Props = {
  value: DeliveryType;
  onChange: (value: DeliveryType) => void;
  iconColor?: string;
  /** Header trigger icon size (default scaled 28). */
  iconSize?: number;
};

export const ServiceTypeSelector: React.FC<Props> = ({
  value,
  onChange,
  iconColor = colors.navy,
  iconSize = DEFAULT_ICON_SIZE,
}) => {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find(o => o.key === value) ?? OPTIONS[1];
  const CurrentIcon = current.Icon;
  const hitSize = Math.max(scale(44), iconSize + scale(16));

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, {width: hitSize, height: hitSize}]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityLabel={`Service type: ${current.label}`}>
        <CurrentIcon color={iconColor} size={iconSize} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Service type</Text>
            {OPTIONS.map(opt => {
              const active = opt.key === value;
              const OptIcon = opt.Icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  activeOpacity={0.85}>
                  <OptIcon
                    color={active ? colors.green : colors.navy}
                    size={MENU_ICON_SIZE}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      active && styles.optionLabelActive,
                    ]}>
                    {opt.label}
                  </Text>
                  {active ? (
                    <CheckIcon
                      size={moderateScale(14)}
                      color={colors.white}
                      strokeWidth={3}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: verticalScale(50),
    paddingRight: spacing.xl,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    minWidth: scale(180),
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuTitle: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    gap: spacing.sm,
  },
  optionActive: {backgroundColor: `${colors.green}14`},
  optionLabel: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
  },
  optionLabelActive: {fontWeight: '800', color: colors.green},
});
