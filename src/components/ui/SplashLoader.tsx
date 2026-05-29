import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {colors} from '../../theme';

const SIZE = 52;
const STROKE = 4.5;

type Props = {
  size?: number;
};

export const SplashLoader: React.FC<Props> = ({size = SIZE}) => {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = size / SIZE;
  const stroke = STROKE * scale;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = circ * 0.13;
  const orangeArc = circ * 0.5;
  const greenArc = circ * 0.34;
  const orangeOffset = gap / 2;
  const greenOffset = -(orangeArc + gap / 2);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.wrap, {width: size, height: size}]}>
      <Animated.View
        style={[
          styles.spinner,
          {width: size, height: size, transform: [{rotate}]},
        ]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={colors.orange}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${orangeArc} ${circ - orangeArc}`}
            strokeDashoffset={orangeOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={colors.green}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${greenArc} ${circ - greenArc}`}
            strokeDashoffset={greenOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
