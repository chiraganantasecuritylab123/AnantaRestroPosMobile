import React from 'react';
import Svg, {Circle, Line, Path, Rect} from 'react-native-svg';
import {colors} from '../../../theme';
import type {SvgIconProps} from './types';

const defaultColor = colors.navy;

function strokeProps(color: string, strokeWidth: number) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export const ChevronRightIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const ChevronLeftIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6l-6 6 6 6"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const MenuIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={4} y1={7} x2={20} y2={7} {...strokeProps(color, strokeWidth)} />
    <Line x1={4} y1={12} x2={20} y2={12} {...strokeProps(color, strokeWidth)} />
    <Line x1={4} y1={17} x2={20} y2={17} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const BellIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z"
      {...strokeProps(color, strokeWidth)}
    />
    <Path d="M10 20a2 2 0 004 0" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const CloseIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={6} y1={6} x2={18} y2={18} {...strokeProps(color, strokeWidth)} />
    <Line x1={18} y1={6} x2={6} y2={18} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const CheckIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12l5 5L19 7" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const PlusIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={12} y1={5} x2={12} y2={19} {...strokeProps(color, strokeWidth)} />
    <Line x1={5} y1={12} x2={19} y2={12} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const MinusIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={5} y1={12} x2={19} y2={12} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const UserIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} {...strokeProps(color, strokeWidth)} />
    <Path
      d="M5 20c1.5-3.5 4.5-5 7-5s5.5 1.5 7 5"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const UsersIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={8} r={3} {...strokeProps(color, strokeWidth)} />
    <Path d="M3 19c1.2-2.5 3.2-4 6-4" {...strokeProps(color, strokeWidth)} />
    <Circle cx={17} cy={9} r={2.5} {...strokeProps(color, strokeWidth)} />
    <Path d="M14 19c.8-2 2.4-3.5 5-3.5" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const CartIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 6h15l-1.5 9H8L6 6z"
      {...strokeProps(color, strokeWidth)}
    />
    <Circle cx={10} cy={19} r={1.5} fill={color} />
    <Circle cx={17} cy={19} r={1.5} fill={color} />
    <Path d="M6 6L5 3H2" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const InfoIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
    <Line x1={12} y1={11} x2={12} y2={16} {...strokeProps(color, strokeWidth)} />
    <Circle cx={12} cy={8} r={1} fill={color} />
  </Svg>
);

export const CameraIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 8h4l2-2h4l2 2h4v10H4V8z"
      {...strokeProps(color, strokeWidth)}
    />
    <Circle cx={12} cy={13} r={3} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const CalendarIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={4}
      y={5}
      width={16}
      height={15}
      rx={2}
      {...strokeProps(color, strokeWidth)}
    />
    <Line x1={4} y1={9} x2={20} y2={9} {...strokeProps(color, strokeWidth)} />
    <Line x1={9} y1={3} x2={9} y2={7} {...strokeProps(color, strokeWidth)} />
    <Line x1={15} y1={3} x2={15} y2={7} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const LockIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={6} y={10} width={12} height={10} rx={2} {...strokeProps(color, strokeWidth)} />
    <Path d="M8 10V8a4 4 0 118 0v2" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const ShieldIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z"
      {...strokeProps(color, strokeWidth)}
    />
    <Path d="M9 12l2 2 4-4" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const PhoneIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 3h8l1 5-3 1.5a11 11 0 005.5 5.5L19 12l5 1v8l-3 1C10.5 20 4 13.5 3 6L4 3z"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const MailIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={6} width={18} height={12} rx={2} {...strokeProps(color, strokeWidth)} />
    <Path d="M3 8l9 6 9-6" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const LogOutIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 17l-5-5 5-5" {...strokeProps(color, strokeWidth)} />
    <Line x1={5} y1={12} x2={19} y2={12} {...strokeProps(color, strokeWidth)} />
    <Path d="M14 5h5v14h-5" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const PackageIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l8 4v10l-8 4-8-4V7l8-4z"
      {...strokeProps(color, strokeWidth)}
    />
    <Path d="M12 7v14M4 7l8 4 8-4" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const ClipboardIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={6} y={5} width={12} height={16} rx={2} {...strokeProps(color, strokeWidth)} />
    <Path d="M9 5V4a3 3 0 116 0v1" {...strokeProps(color, strokeWidth)} />
    <Line x1={9} y1={11} x2={15} y2={11} {...strokeProps(color, strokeWidth)} />
    <Line x1={9} y1={15} x2={13} y2={15} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const ReceiptIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 4h10v16l-2-1-2 1-2-1-2 1-2-1V4z"
      {...strokeProps(color, strokeWidth)}
    />
    <Line x1={9} y1={8} x2={15} y2={8} {...strokeProps(color, strokeWidth)} />
    <Line x1={9} y1={12} x2={15} y2={12} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const ShoppingBagIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 9V7a5 5 0 0110 0v2M6 9h12l-1 12H7L6 9z"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const PrinterIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 9V4h10v5M7 14H5a2 2 0 01-2-2v-3h18v3a2 2 0 01-2 2h-2"
      {...strokeProps(color, strokeWidth)}
    />
    <Rect x={7} y={14} width={10} height={6} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const UtensilsIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 3v8a3 3 0 006 0V3" {...strokeProps(color, strokeWidth)} />
    <Line x1={9} y1={11} x2={9} y2={21} {...strokeProps(color, strokeWidth)} />
    <Path d="M16 3v18" {...strokeProps(color, strokeWidth)} />
    <Path d="M19 3v6a2 2 0 01-2 2h-1" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const SettingsIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} {...strokeProps(color, strokeWidth)} />
    <Path
      d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const ClockIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
    <Path d="M12 7v5l3 2" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const BarChartIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1={5} y1={20} x2={5} y2={12} {...strokeProps(color, strokeWidth)} />
    <Line x1={12} y1={20} x2={12} y2={6} {...strokeProps(color, strokeWidth)} />
    <Line x1={19} y1={20} x2={19} y2={10} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const TrendingUpIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 16l6-6 4 4 6-8" {...strokeProps(color, strokeWidth)} />
    <Path d="M14 6h6v6" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const GlobeIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
    <Line x1={3} y1={12} x2={21} y2={12} {...strokeProps(color, strokeWidth)} />
    <Path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const GridIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={4} width={7} height={7} rx={1.5} {...strokeProps(color, strokeWidth)} />
    <Rect x={13} y={4} width={7} height={7} rx={1.5} {...strokeProps(color, strokeWidth)} />
    <Rect x={4} y={13} width={7} height={7} rx={1.5} {...strokeProps(color, strokeWidth)} />
    <Rect x={13} y={13} width={7} height={7} rx={1.5} {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const TrendingDownIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8l6 6 4-4 6 8" {...strokeProps(color, strokeWidth)} />
    <Path d="M14 18h6v-6" {...strokeProps(color, strokeWidth)} />
  </Svg>
);

export const EditIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);

export const TrashIcon: React.FC<SvgIconProps> = ({
  size = 24,
  color = defaultColor,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 7h16" {...strokeProps(color, strokeWidth)} />
    <Path
      d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
      {...strokeProps(color, strokeWidth)}
    />
    <Path
      d="M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12"
      {...strokeProps(color, strokeWidth)}
    />
  </Svg>
);
