import React, {useEffect} from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SplashLoader} from '../components/ui';
import {typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';
import {isOnboardingComplete} from '../storage/appStorage';
import {
  maxContentWidth,
  moderateScale,
  scale,
  useBrandLogoSize,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SPLASH_MIN_MS = 2200;

export const SplashContent: React.FC = () => {
  const logoSize = useBrandLogoSize();

  return (
    <ImageBackground
      source={require('../assets/splash-bg.png')}
      style={styles.root}
      resizeMode="cover">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.main}>
          <View style={styles.logoBlock}>
            <Image
              source={require('../assets/splash-screen-logo.png')}
              style={[styles.logo, logoSize]}
              resizeMode="contain"
              accessibilityLabel="Ananta POS logo"
            />
            <Text style={styles.tagline}>
              Smart Billing. Complete Business Control.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <SplashLoader size={moderateScale(52)} />
          <Text style={styles.loadingLabel}>Loading your business…</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

export const SplashScreen: React.FC<Props> = ({navigation}) => {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) {
        return;
      }
      const done = await isOnboardingComplete();
      navigation.replace(done ? 'Login' : 'Onboarding');
    }, SPLASH_MIN_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation]);

  return <SplashContent />;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safe: {
    flex: 1,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(28),
  },
  logoBlock: {
    alignItems: 'center',
    width: '100%',
    maxWidth: maxContentWidth(),
  },
  logo: {
    alignSelf: 'center',
  },
  tagline: {
    marginTop: verticalScale(20),
    ...typography.caption,
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    paddingHorizontal: scale(12),
    maxWidth: scale(320),
  },
  footer: {
    alignItems: 'center',
    paddingBottom: verticalScale(55),
    paddingTop: verticalScale(20),
    gap: verticalScale(14),
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
    width: '100%',
  },
  loadingLabel: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
});
