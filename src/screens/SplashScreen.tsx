import React, {useEffect} from 'react';
import {
  Dimensions,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SPLASH_MIN_MS = 2200;

const {width: SCREEN_W} = Dimensions.get('window');
const LOGO_W = Math.min(SCREEN_W * 0.72, 300);
const LOGO_H = LOGO_W * 0.55;

export const SplashContent: React.FC = () => (
  <ImageBackground
    source={require('../assets/splash-bg.png')}
    style={styles.root}
    resizeMode="cover">
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.main}>
        <View style={styles.logoBlock}>
          <Image
            source={require('../assets/splash-screen-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Ananta POS logo"
          />
          <Text style={styles.tagline}>
            Smart Billing. Complete Business Control.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <SplashLoader size={52} />
        <Text style={styles.loadingLabel}>Loading your business…</Text>
      </View>
    </SafeAreaView>
  </ImageBackground>
);

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
    paddingHorizontal: 28,
  },
  logoBlock: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: LOGO_W,
    height: LOGO_H,
  },
  tagline: {
    marginTop: 20,
    ...typography.caption,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    maxWidth: 320,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 55,
    paddingTop: 20,
    gap: 14,
  },
  loadingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
});
