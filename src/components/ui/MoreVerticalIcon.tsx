import React from 'react';
import Svg, {Circle} from 'react-native-svg';
import {colors} from '../../theme';
import {moderateScale} from '../../utils/responsive';

type Props = {
  size?: number;
  color?: string;
};

export const MoreVerticalIcon: React.FC<Props> = ({
  size = moderateScale(22),
  color = colors.navy,
}) => {
  const dot = size * 0.18;
  const cx = size / 2;
  const gap = size * 0.28;
  const cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy - gap} r={dot} fill={color} />
      <Circle cx={cx} cy={cy} r={dot} fill={color} />
      <Circle cx={cx} cy={cy + gap} r={dot} fill={color} />
    </Svg>
  );
};
