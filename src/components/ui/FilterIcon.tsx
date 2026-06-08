import React from 'react';
import Svg, {Line} from 'react-native-svg';
import {colors} from '../../theme';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Funnel / filter-list icon (three horizontal bars). */
export const FilterIcon: React.FC<Props> = ({
  size = 22,
  color = colors.navy,
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line
      x1={4}
      y1={5}
      x2={20}
      y2={5}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Line
      x1={6}
      y1={12}
      x2={18}
      y2={12}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Line
      x1={8}
      y1={19}
      x2={16}
      y2={19}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);
