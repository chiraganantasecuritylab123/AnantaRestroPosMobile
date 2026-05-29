import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../services/authApi';
import {useAppDispatch} from '../useAppHooks';
import {setAuth} from '../features/authTokenSlice';
import {
  BrandHeader,
  GradientButton,
  LoginScreenBackground,
  OtpInput,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VerifyOtpScreen: React.FC<Props> = ({navigation, route}) => {
  const {phoneMasked, preAuthToken, expiresInSec = 300, devHint} = route.params;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(expiresInSec);
  const [verifyOtp, {isLoading: verifying}] = useVerifyOtpMutation();
  const [sendOtp, {isLoading: resending}] = useSendOtpMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (__DEV__ && devHint && devHint.length === 6) {
      setOtp(devHint);
    }
  }, [devHint]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const onVerify = async () => {
    setError(null);
    if (otp.length < 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    try {
      const res = await verifyOtp({otp, preAuthToken}).unwrap();
      if (!res?.success || !res?.accessToken) {
        setError(res?.message ?? 'Invalid OTP');
        return;
      }
      dispatch(
        setAuth({
          token: res.accessToken,
          user: res.user ?? null,
        }),
      );
    } catch (e: any) {
      setError(e?.data?.message ?? 'Invalid OTP');
    }
  };

  const onResend = async () => {
    if (secondsLeft > 0 || resending) {
      return;
    }
    setError(null);
    try {
      const res = await sendOtp({preAuthToken}).unwrap();
      setSecondsLeft(res?.expiresInSec ?? 300);
      setOtp('');
    } catch (e: any) {
      setError(e?.data?.message ?? 'Unable to resend OTP');
    }
  };

  const validityMinutes = Math.max(1, Math.round(expiresInSec / 60));

  return (
    <LoginScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <BrandHeader style={styles.brand} />

            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              We&apos;ve sent a 6-digit OTP to
            </Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phone}>{phoneMasked}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.edit}>
                  ✎ Edit
                </Text>
              </TouchableOpacity>
            </View>

            <OtpInput value={otp} onChange={setOtp} />

            {__DEV__ && devHint ? (
              <Text style={styles.devHint}>Dev OTP: {devHint}</Text>
            ) : null}

            <View style={styles.validityRow}>
              <Text style={styles.validityIcon}>🛡</Text>
              <Text style={styles.validityText}>
                Your OTP is valid for {validityMinutes} minutes
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resendPill}
              onPress={onResend}
              disabled={secondsLeft > 0 || resending}
              activeOpacity={0.85}>
              <Text style={styles.resendText}>
                Didn&apos;t receive OTP?{' '}
                {secondsLeft > 0 ? (
                  <>
                    Resend in{' '}
                    <Text style={styles.resendTimer}>
                      {formatCountdown(secondsLeft)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.resendTimer}>Resend now</Text>
                )}
              </Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <GradientButton
              title="Verify & Continue"
              onPress={onVerify}
              loading={verifying}
              style={styles.verifyBtn}
            />

            <View style={styles.secureFooter}>
              <View style={styles.lockCircle}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <View style={styles.secureTextCol}>
                <Text style={styles.secureTitle}>
                  We never share your information
                </Text>
                <Text style={styles.secureSub}>
                  Secure • Trusted • Reliable
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LoginScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.navy,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  brand: {
    alignSelf: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  phone: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
  },
  edit: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
  },
  devHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.orange,
    fontWeight: '600',
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  validityIcon: {fontSize: 16},
  validityText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  resendPill: {
    marginTop: spacing.lg,
    backgroundColor: colors.borderLight,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  resendTimer: {
    color: colors.green,
    fontWeight: '700',
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.errorBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  verifyBtn: {
    marginTop: spacing.xl,
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {fontSize: 18},
  secureTextCol: {flex: 1},
  secureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  secureSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
});
