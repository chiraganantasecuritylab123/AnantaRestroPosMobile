import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography} from '../../theme';

type Props = {
  compact?: boolean;
  style?: ViewStyle;
};

export const BrandHeader: React.FC<Props> = ({compact, style}) => (
  <View style={[styles.row, style]}>
    <View style={styles.logoWrap}>
      <LinearGradient
        colors={[colors.orange, colors.orangeLight]}
        style={[styles.ribbon, styles.ribbonTop]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
      <LinearGradient
        colors={[colors.green, colors.greenDark]}
        style={[styles.ribbon, styles.ribbonBottom]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
    </View>
    <View>
      <Text style={[styles.name, compact && styles.nameCompact]}>
        Ananta<Text style={styles.nameAccent}>POS</Text>
      </Text>
      {!compact ? (
        <Text style={styles.tagline}>
          Smart Billing. Complete Business Control.
        </Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    width: 28,
    height: 14,
    borderRadius: 6,
  },
  ribbonTop: {
    top: 10,
    left: 8,
    transform: [{rotate: '-25deg'}],
  },
  ribbonBottom: {
    bottom: 10,
    right: 8,
    transform: [{rotate: '25deg'}],
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
  },
  nameCompact: {
    fontSize: 18,
  },
  nameAccent: {
    color: colors.orange,
  },
  tagline: {
    ...typography.caption,
    marginTop: 2,
    maxWidth: 220,
  },
});
