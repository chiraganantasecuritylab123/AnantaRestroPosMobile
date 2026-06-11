import React from 'react';
import Svg, {Circle, Line} from 'react-native-svg';
import {colors} from '../../theme';
import {moderateScale} from '../../utils/responsive';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export const SearchIcon: React.FC<Props> = ({
  size = moderateScale(22),
  color = colors.navy,
  strokeWidth = moderateScale(2),
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={11}
      cy={11}
      r={7}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <Line
      x1={16.5}
      y1={16.5}
      x2={21}
      y2={21}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);
