import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Line, Path, Rect} from 'react-native-svg';
import {colors} from '../../theme';

type TabName = 'Dashboard' | 'POS' | 'Orders' | 'Profile';

const ICON_SIZE = 28;
const STROKE = 2;

type IconProps = {
  color: string;
};

function DashboardIcon({color}: IconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.2L12 4l8 6.2V19a1 1 0 01-1 1H5a1 1 0 01-1-1v-8.8z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M9 20v-6a1 1 0 011-1h4a1 1 0 011 1v6"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PosIcon({color}: IconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={4}
        width={7}
        height={7}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Rect
        x={13}
        y={4}
        width={7}
        height={7}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Rect
        x={4}
        y={13}
        width={7}
        height={7}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Rect
        x={13}
        y={13}
        width={7}
        height={7}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE}
      />
    </Svg>
  );
}

function OrdersIcon({color}: IconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4h8a2 2 0 012 2v14l-4-2-4 2V6a2 2 0 012-2z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Line
        x1={10}
        y1={9}
        x2={14}
        y2={9}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={13}
        x2={14}
        y2={13}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ProfileIcon({color}: IconProps) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={STROKE} />
      <Path
        d="M6 20c0-3.314 2.686-5 6-5s6 1.686 6 5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TAB_ICONS: Record<TabName, React.FC<IconProps>> = {
  Dashboard: DashboardIcon,
  POS: PosIcon,
  Orders: OrdersIcon,
  Profile: ProfileIcon,
};

type Props = {
  name: TabName;
  focused: boolean;
};

export const AppTabBarIcon: React.FC<Props> = ({name, focused}) => {
  const color = focused ? colors.tabActive : colors.tabInactive;
  const Icon = TAB_ICONS[name];

  return (
    <View style={styles.wrap}>
      <Icon color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 40,
  },
});
