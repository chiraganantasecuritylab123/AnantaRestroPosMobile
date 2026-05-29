import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  usePhoneLoginMutation,
  useSendOtpMutation,
} from '../services/authApi';
import {
  BrandHeader,
  Card,
  GradientButton,
  LoginScreenBackground,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function formatPhoneDisplay(digits: string) {
  const d = digits.replace(/\D/g, '').slice(-10);
  if (d.length <= 5) {
    return d;
  }
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [phone, setPhone] = useState(__DEV__ ? '9876543210' : '');
  const [error, setError] = useState<string | null>(null);
  const [phoneLogin, {isLoading: loggingIn}] = usePhoneLoginMutation();
  const [sendOtp, {isLoading: sendingOtp}] = useSendOtpMutation();

  const isLoading = loggingIn || sendingOtp;

  const onSendOtp = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    try {
      const loginRes = await phoneLogin({phone: digits}).unwrap();
      if (!loginRes?.success) {
        setError(loginRes?.message ?? 'Unable to send OTP');
        return;
      }

      const preAuthToken = loginRes?.preAuthToken;
      if (!preAuthToken) {
        setError('Missing session token. Please try again.');
        return;
      }

      let expiresInSec = 300;
      try {
        const otpRes = await sendOtp({preAuthToken}).unwrap();
        if (otpRes?.expiresInSec) {
          expiresInSec = otpRes.expiresInSec;
        }
      } catch {
        // phone/login may already trigger OTP; continue with preAuthToken
      }

      navigation.navigate('VerifyOtp', {
        phone: digits,
        phoneMasked:
          loginRes?.phoneMasked ?? `+91 ${formatPhoneDisplay(digits)}`,
        preAuthToken,
        expiresInSec,
        devHint: loginRes?.devHint,
      });
    } catch (e: any) {
      setError(e?.data?.message ?? 'Unable to send OTP');
    }
  };

  const onPhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  return (
    <LoginScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <BrandHeader style={styles.brand} />

            <Text style={styles.headline}>Welcome Back!</Text>
            <Text style={styles.lead}>
              Manage your business from anywhere
            </Text>

            <Card style={styles.formCard}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>📱</Text>
              </View>
              <Text style={styles.cardTitle}>Login with OTP</Text>
              <Text style={styles.cardDesc}>
                We&apos;ll send a One Time Password to your mobile number
              </Text>

              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.countryCode} activeOpacity={0.8}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <Text style={styles.chevron}>▾</Text>
                </TouchableOpacity>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.mutedLight}
                  value={formatPhoneDisplay(phone)}
                  onChangeText={onPhoneChange}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <GradientButton
                title="Send OTP"
                onPress={onSendOtp}
                loading={isLoading}
                style={styles.submitBtn}
              />
            </Card>

            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, {backgroundColor: '#DCFCE7'}]}>
                  <Text style={styles.trustIcon}>🛡</Text>
                </View>
                <Text style={styles.trustLabel}>Secure Login</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, {backgroundColor: '#FFEDD5'}]}>
                  <Text style={styles.trustIcon}>🔒</Text>
                </View>
                <Text style={styles.trustLabel}>No Password{'\n'}Required</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, {backgroundColor: '#DBEAFE'}]}>
                  <Text style={styles.trustIcon}>OTP</Text>
                </View>
                <Text style={styles.trustLabel}>OTP{'\n'}Verification</Text>
              </View>
            </View>

            <View style={styles.legalRow}>
              <Text style={styles.legalShield}>🛡</Text>
              <Text style={styles.footerHint}>
                By continuing, you agree to our{' '}
                <Text style={styles.link}>Terms & Conditions</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  brand: {marginBottom: spacing.xl, alignSelf: 'center'},
  headline: {
    ...typography.hero,
    fontSize: 28,
    textAlign: 'left',
  },
  lead: {
    ...typography.body,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  formCard: {
    padding: spacing.xl,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardIcon: {fontSize: 20},
  cardTitle: {
    ...typography.subtitle,
    fontSize: 18,
  },
  cardDesc: {
    ...typography.caption,
    marginTop: 6,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  chevron: {
    fontSize: 10,
    color: colors.muted,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.navy,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.errorBg,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {marginTop: spacing.xl},
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xs,
  },
  trustItem: {flex: 1, alignItems: 'center'},
  trustIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  trustIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  trustLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    lineHeight: 15,
  },
  trustDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginTop: 8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  legalShield: {fontSize: 14, marginTop: 2},
  footerHint: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  link: {
    color: colors.green,
    fontWeight: '600',
  },
});
