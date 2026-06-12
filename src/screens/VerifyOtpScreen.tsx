import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../services/authApi';
import { useAppDispatch } from '../useAppHooks';
import { setAuth, setOutletId } from '../features/authTokenSlice';
import { extractOutletIdFromUser, pickOutletId } from '../utils/outletId';
import {
  ChevronLeftIcon,
  GradientButton,
  LockIcon,
  LoginScreenBackground,
  OtpInput,
  ShieldIcon,
} from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import {
  extractRtkQueryError,
  formatOtpVerifyError,
} from '../utils/apiError';
import { extractSixDigitOtp } from '../utils/otpAutoFill';
import {
  maxContentWidth,
  moderateScale,
  scale,
  useBrandLogoSize,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VerifyOtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    phoneMasked,
    preAuthToken,
    flow,
    expiresInSec = 300,
    devHint,
  } = route.params;
  const isRegisterFlow = flow === 'register';
  const [otp, setOtp] = useState('');
  const [apiOtpHint, setApiOtpHint] = useState(devHint ?? '');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(expiresInSec);
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: resending }] = useSendOtpMutation();
  const dispatch = useAppDispatch();
  const autoVerifyRef = useRef(false);
  const lastSubmittedOtpRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewHeightRef = useRef(0);
  const footerBottomInWrapRef = useRef(0);
  const logoSize = useBrandLogoSize();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardOpenRef = useRef(false);

  const scrollToKeyboardBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const viewHeight = scrollViewHeightRef.current;
      const footerBottomInWrap = footerBottomInWrapRef.current;
      if (viewHeight <= 0 || footerBottomInWrap <= 0) {
        return;
      }
      const scrollPaddingTop = keyboardOpen
        ? verticalScale(8)
        : spacing.xl + verticalScale(6);
      const footerBottom = scrollPaddingTop + footerBottomInWrap;
      const bottomInset = verticalScale(30);
      const targetY = Math.max(0, footerBottom - viewHeight + bottomInset);
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [keyboardOpen]);

  useEffect(() => {
    keyboardOpenRef.current = keyboardOpen;
    scrollToKeyboardBottom();
  }, [keyboardOpen]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardOpen(true);
      scrollToKeyboardBottom();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToKeyboardBottom]);

  useEffect(() => {
    if (!keyboardOpen) {
      return;
    }
    const timer = setTimeout(scrollToKeyboardBottom, 80);
    return () => clearTimeout(timer);
  }, [keyboardOpen, scrollToKeyboardBottom]);

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

      const result = await verifyOtp({otp: normalized, preAuthToken});

      if ('error' in result) {
        lastSubmittedOtpRef.current = '';
        autoVerifyRef.current = false;
        setError(extractRtkQueryError(result.error, 'Invalid OTP'));
        return;
      }

      const res = result.data;
      if (!res?.success) {
        lastSubmittedOtpRef.current = '';
        autoVerifyRef.current = false;
        setError(formatOtpVerifyError(res));
        return;
      }

      const resolvedFlow = res.flow ?? flow;
      const signupToken = res.preAuthToken ?? preAuthToken;

      if (res.accessToken) {
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
        return;
      }

      if (resolvedFlow === 'register') {
        navigation.replace('SignupComplete', {
          preAuthToken: signupToken,
          phoneMasked,
        });
        return;
      }

      lastSubmittedOtpRef.current = '';
      autoVerifyRef.current = false;
      setError(formatOtpVerifyError(res));
    },
    [dispatch, flow, navigation, phoneMasked, preAuthToken, verifyOtp, verifying],
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
      const res = await sendOtp({ preAuthToken }).unwrap();
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
          hitSlop={{
            top: scale(12),
            bottom: scale(12),
            left: scale(12),
            right: scale(12),
          }}>
          <ChevronLeftIcon size={moderateScale(22)} color={colors.navy} />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? insets.top + verticalScale(100) : verticalScale(10)
          }>
          <ScrollView
            ref={scrollRef}
            onLayout={e => {
              scrollViewHeightRef.current = e.nativeEvent.layout.height;
              if (keyboardOpenRef.current) {
                scrollToKeyboardBottom();
              }
            }}
            contentContainerStyle={[
              styles.scroll,
              keyboardOpen && styles.scrollKeyboardOpen,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            automaticallyAdjustKeyboardInsets={!keyboardOpen}>
            <View style={styles.contentWrap}>
              {/* {!keyboardOpen ? (
            ) : null} */}
              <View style={styles.brand}>
                <Image
                  source={require('../assets/splash-screen-logo.png')}
                  style={[styles.logo, logoSize]}
                  resizeMode="contain"
                />
                <Text style={styles.tagline}>
                  Smart Billing. Complete Business Control.
                </Text>
              </View>

              <Text style={[styles.title, keyboardOpen && styles.titleKeyboardOpen]}>
                {isRegisterFlow ? 'Verify to Register' : 'Verify Your Number'}
              </Text>
              <Text style={styles.subtitle}>
                {isRegisterFlow
                  ? 'Enter the OTP to verify your phone and continue signup'
                  : "We've sent a 6-digit OTP to"}
              </Text>
              <View style={styles.phoneRow}>
                <Text style={styles.phone}>{phoneMasked}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  hitSlop={{
                    top: scale(8),
                    bottom: scale(8),
                    left: scale(8),
                    right: scale(8),
                  }}>
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
                  onInputFocus={scrollToKeyboardBottom}
                  autoFocus
                />
              </View>
              {__DEV__ && apiOtpHint ? (
                <Text style={styles.devHint}>
                  Dev OTP hint: {apiOtpHint}
                </Text>
              ) : null}

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.validityRow}>
                <View style={styles.validityBadge}>
                  <ShieldIcon size={moderateScale(18)} color={colors.green} />
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

              <GradientButton
                title={isRegisterFlow ? 'Verify & Continue' : 'Verify & Sign In'}
                onPress={onVerify}
                loading={verifying}
                style={styles.verifyBtn}
              />

              <View
                style={styles.secureFooter}
                onLayout={e => {
                  const { y, height } = e.nativeEvent.layout;
                  footerBottomInWrapRef.current = y + height;
                  if (keyboardOpenRef.current) {
                    scrollToKeyboardBottom();
                  }
                }}>
                <View style={styles.lockCircle}>
                  <LockIcon size={moderateScale(16)} color={colors.muted} />
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LoginScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(12),
    left: spacing.lg,
    zIndex: 10,
    width: moderateScale(36),
    height: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(20),
  },
  backText: {
    fontSize: moderateScale(24),
    color: colors.navy,
    fontWeight: '400',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + verticalScale(6),
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  scrollKeyboardOpen: {
    paddingTop: verticalScale(8),
    paddingBottom: spacing.lg,
  },
  contentWrap: {
    width: '100%',
    maxWidth: maxContentWidth(),
  },
  brand: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl + scale(4),
  },
  logo: {
    width: scale(220),
    aspectRatio: 220 / 150,
  },
  tagline: {
    marginTop: verticalScale(-10),
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: '#5F6981',
    textAlign: 'center',
  },
  title: {
    ...typography.hero,
    fontSize: moderateScale(24),
    lineHeight: moderateScale(48),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleKeyboardOpen: {
    fontSize: moderateScale(20),
    lineHeight: moderateScale(28),
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontSize: moderateScale(14),
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
    flexWrap: 'wrap',
  },
  phone: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.navy,
    flexShrink: 1,
  },
  edit: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.green,
  },
  otpWrap: {
    marginTop: spacing.xs,
  },
  devHint: {
    marginTop: spacing.sm,
    fontSize: moderateScale(12),
    color: colors.orange,
    fontWeight: '600',
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  validityBadge: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityIcon: { fontSize: moderateScale(14) },
  validityText: {
    fontSize: moderateScale(14),
    color: colors.muted,
    fontWeight: '600',
    flexShrink: 1,
  },
  resendPill: {
    marginTop: spacing.lg,
    backgroundColor: '#F1F3F6',
    borderRadius: radii.pill,
    paddingVertical: verticalScale(16),
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  resendText: {
    fontSize: moderateScale(14),
    color: '#5F6981',
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: moderateScale(14),
    fontWeight: '600',
    textAlign: 'center',
  },
  verifyBtn: {
    marginTop: spacing.lg + scale(4),
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    width: '100%',
  },
  lockCircle: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockIcon: { fontSize: moderateScale(18) },
  secureTextCol: { flexShrink: 1 },
  secureTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#5F6981',
  },
  secureSub: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: '#5F6981',
    fontWeight: '600',
  },
});
