import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Image,
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
import {setAuth, setOutletId} from '../features/authTokenSlice';
import {extractOutletIdFromUser, pickOutletId} from '../utils/outletId';
import {
  ChevronLeftIcon,
  GradientButton,
  LockIcon,
  LoginScreenBackground,
  OtpInput,
  ShieldIcon,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';
import {extractSixDigitOtp} from '../utils/otpAutoFill';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VerifyOtpScreen: React.FC<Props> = ({navigation, route}) => {
  const {phoneMasked, preAuthToken, expiresInSec = 300, devHint} = route.params;
  const [otp, setOtp] = useState('');
  const [apiOtpHint, setApiOtpHint] = useState(devHint ?? '');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(expiresInSec);
  const [verifyOtp, {isLoading: verifying}] = useVerifyOtpMutation();
  const [sendOtp, {isLoading: resending}] = useSendOtpMutation();
  const dispatch = useAppDispatch();
  const autoVerifyRef = useRef(false);
  const lastSubmittedOtpRef = useRef('');

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const submitVerify = useCallback(
    async (code: string) => {
      const normalized = extractSixDigitOtp(code) ?? code;
      if (normalized.length < 6 || verifying) {
        return;
      }
      if (lastSubmittedOtpRef.current === normalized) {
        return;
      }
      lastSubmittedOtpRef.current = normalized;
      setError(null);
      try {
        const res = await verifyOtp({otp: normalized, preAuthToken}).unwrap();
        if (!res?.success || !res?.accessToken) {
          lastSubmittedOtpRef.current = '';
          setError(res?.message ?? 'Invalid OTP');
          return;
        }
        dispatch(
          setAuth({
            token: res.accessToken,
            user: res.user ?? null,
          }),
        );
        const outletFromOtp = pickOutletId(
          res.user?.tenant_id,
          res.outlet_id != null ? String(res.outlet_id) : null,
          res.outletId != null ? String(res.outletId) : null,
          extractOutletIdFromUser(res.user),
        );
        if (outletFromOtp) {
          dispatch(setOutletId(outletFromOtp));
        }
      } catch (e: any) {
        lastSubmittedOtpRef.current = '';
        setError(e?.data?.message ?? 'Invalid OTP');
      }
    },
    [dispatch, preAuthToken, verifyOtp, verifying],
  );

  useEffect(() => {
    const hint = extractSixDigitOtp(apiOtpHint);
    if (!hint) {
      return;
    }
    setOtp(hint);
    const timer = setTimeout(() => {
      void submitVerify(hint);
    }, 200);
    return () => clearTimeout(timer);
  }, [apiOtpHint, submitVerify]);

  const onVerify = () => {
    if (otp.length < 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    void submitVerify(otp);
  };

  const onOtpComplete = useCallback(
    (code: string) => {
      if (autoVerifyRef.current) {
        return;
      }
      autoVerifyRef.current = true;
      void submitVerify(code);
    },
    [submitVerify],
  );

  const onOtpChange = useCallback((code: string) => {
    autoVerifyRef.current = false;
    lastSubmittedOtpRef.current = '';
    setError(null);
    setOtp(code);
  }, []);

  const onResend = async () => {
    if (secondsLeft > 0 || resending) {
      return;
    }
    setError(null);
    autoVerifyRef.current = false;
    lastSubmittedOtpRef.current = '';
    try {
      const res = await sendOtp({preAuthToken}).unwrap();
      setSecondsLeft(res?.expiresInSec ?? 300);
      setOtp('');
      if (res?.devHint) {
        setApiOtpHint(res.devHint);
      }
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
          <ChevronLeftIcon size={22} color={colors.navy} />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.brand}>
              <Image
                source={require('../assets/splash-screen-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>
                Smart Billing. Complete Business Control.
              </Text>
            </View>

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
                  Edit ✎
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.otpWrap}>
              <OtpInput
                value={otp}
                onChange={onOtpChange}
                onComplete={onOtpComplete}
                autoFocus
              />
            </View>
            {__DEV__ && apiOtpHint ? (
              <Text style={styles.devHint}>
                Dev OTP hint: {apiOtpHint}
              </Text>
            ) : null}
            
            <View style={styles.validityRow}>
              <View style={styles.validityBadge}>
                <ShieldIcon size={18} color={colors.green} />
              </View>
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
          </ScrollView>

          <View style={styles.secureFooter}>
            <View style={styles.lockCircle}>
              <LockIcon size={16} color={colors.muted} />
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
    top: Platform.OS === 'ios' ? 50 : 12,
    left: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.navy,
    fontWeight: '400',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 6,
    paddingBottom: spacing.lg,
  },
  brand: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl + 4,
  },
  logo: {
    width: 220,
    height: 150,
  },
  tagline: {
    marginTop: -10,
    fontSize: 13,
    fontWeight: '500',
    color: '#5F6981',
    textAlign: 'center',
  },
  title: {
    ...typography.hero,
    fontSize: 24,
    lineHeight: 48,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    color: '#5B647B',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.green,
  },
  otpWrap: {
    marginTop: spacing.xs,
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
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  validityBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityIcon: {fontSize: 14},
  validityText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  resendPill: {
    marginTop: spacing.lg,
    backgroundColor: '#F1F3F6',
    borderRadius: radii.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#5F6981',
    fontWeight: '600',
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
    marginTop: spacing.lg + 4,
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.6)',
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
  secureTextCol: {},
  secureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6981',
  },
  secureSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#5F6981',
    fontWeight: '600',
  },
});
