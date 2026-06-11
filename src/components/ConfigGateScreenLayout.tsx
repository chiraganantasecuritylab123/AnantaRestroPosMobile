import React from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GradientButton, SplashLoader} from './ui';
import {colors, radii, spacing, typography} from '../theme';
import {moderateScale, scale, verticalScale} from '../utils/responsive';

type Props = {
  icon: React.ReactNode;
  title: string;
  message: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  footer?: React.ReactNode;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
};

const ICON_WRAP_SIZE = moderateScale(72);

export const ConfigGateScreenLayout: React.FC<Props> = ({
  icon,
  title,
  message,
  primaryAction,
  secondaryAction,
  footer,
  children,
  contentStyle,
}) => (
  <ImageBackground
    source={require('../assets/splash-bg.png')}
    style={styles.root}
    resizeMode="cover">
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.content, contentStyle]}>
        <Image
          source={require('../assets/splash-screen-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.iconWrap}>{icon}</View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {children}

        {primaryAction ? (
          <GradientButton
            title={primaryAction.label}
            onPress={primaryAction.onPress}
            loading={primaryAction.loading}
            showArrow={false}
            style={styles.primaryBtn}
          />
        ) : null}

        {secondaryAction ? (
          <Text style={styles.secondaryBtn} onPress={secondaryAction.onPress}>
            {secondaryAction.label}
          </Text>
        ) : null}

        {footer}
      </View>

      {primaryAction?.loading ? (
        <View style={styles.loadingRow}>
          <SplashLoader size={moderateScale(36)} />
        </View>
      ) : null}
    </SafeAreaView>
  </ImageBackground>
);

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {flex: 1},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  logo: {
    width: scale(180),
    aspectRatio: 1.5,
    height: undefined,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: ICON_WRAP_SIZE,
    height: ICON_WRAP_SIZE,
    borderRadius: ICON_WRAP_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(12),
    shadowOffset: {width: 0, height: verticalScale(4)},
    elevation: 4,
  },
  title: {
    ...typography.hero,
    fontSize: moderateScale(26),
    textAlign: 'center',
    color: colors.navy,
  },
  message: {
    marginTop: spacing.md,
    fontSize: moderateScale(15),
    lineHeight: verticalScale(23),
    textAlign: 'center',
    color: colors.muted,
    maxWidth: scale(340),
  },
  primaryBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  secondaryBtn: {
    marginTop: spacing.lg,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.green,
  },
  loadingRow: {
    position: 'absolute',
    bottom: spacing.xxxl,
    alignSelf: 'center',
  },
});
