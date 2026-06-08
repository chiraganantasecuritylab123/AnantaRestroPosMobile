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
          <SplashLoader size={36} />
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
    width: 180,
    height: 120,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    textAlign: 'center',
    color: colors.navy,
  },
  message: {
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    color: colors.muted,
    maxWidth: 340,
  },
  primaryBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  secondaryBtn: {
    marginTop: spacing.lg,
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
  },
  loadingRow: {
    position: 'absolute',
    bottom: spacing.xxxl,
    alignSelf: 'center',
  },
});
