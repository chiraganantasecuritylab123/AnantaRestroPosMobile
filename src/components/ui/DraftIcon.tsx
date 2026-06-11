import React from 'react';
import Svg, {Path, Rect} from 'react-native-svg';
import {colors} from '../../theme';
import {moderateScale} from '../../utils/responsive';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export const DraftIcon: React.FC<Props> = ({
  size = moderateScale(22),
  color = colors.navy,
  strokeWidth = moderateScale(2),
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x={5}
      y={3}
      width={14}
      height={18}
      rx={2}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Path
      d="M9 8h6M9 12h6M9 16h4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);
