import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {cardShadow, colors, radii} from '../../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  largeShadow?: boolean;
};

export const Card: React.FC<Props> = ({children, style}) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    ...cardShadow,
  },
});
