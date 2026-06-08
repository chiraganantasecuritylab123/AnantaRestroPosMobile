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
  Image,
  Vibration,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  usePhoneLoginMutation,
  useSendOtpMutation,
} from '../services/authApi';
import {
  Card,
  CheckIcon,
  ChevronRightIcon,
  GradientButton,
  LockIcon,
  LoginScreenBackground,
  PhoneIcon,
  ShieldIcon,
} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';
import type {AuthStackParamList} from '../navigation/types';
import {
  buildAuthPhone,
  COUNTRY_DIAL_OPTIONS,
  DEFAULT_COUNTRY,
  formatNationalPhoneDisplay,
  maskAuthPhone,
  type CountryDialOption,
} from '../utils/countryDialCodes';
import {
  resolvePrivacyUrl,
  resolveTermsUrl,
  useGetConfigQuery,
} from '../services/configApi';
import {openExternalUrl} from '../utils/openExternalUrl';
import {getAppVersion} from '../constants/appVersion';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function OtpIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={5}
        width={16}
        height={14}
        rx={2}
        stroke="#1D4ED8"
        strokeWidth={2}
      />
      <Circle cx={9} cy={12} r={1.2} fill="#1D4ED8" />
      <Circle cx={12} cy={12} r={1.2} fill="#1D4ED8" />
      <Circle cx={15} cy={12} r={1.2} fill="#1D4ED8" />
    </Svg>
  );
}

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const [phone, setPhone] = useState(__DEV__ ? '' : '');
  const [country, setCountry] = useState<CountryDialOption>(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneLogin, {isLoading: loggingIn}] = usePhoneLoginMutation();
  const [sendOtp, {isLoading: sendingOtp}] = useSendOtpMutation();
  const {data: appConfig} = useGetConfigQuery();

  const termsUrl = resolveTermsUrl(appConfig?.data);
  const privacyUrl = resolvePrivacyUrl(appConfig?.data);

  const isLoading = loggingIn || sendingOtp;

  const onSendOtp = async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    } else {
      Vibration.vibrate();
    }
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== country.nationalLength) {
      setError(
        `Enter a valid ${country.nationalLength}-digit mobile number`,
      );
      return;
    }

    const authPhone = buildAuthPhone(country, digits);

    try {
      const loginRes = await phoneLogin({phone: authPhone}).unwrap();
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
      let otpDevHint = loginRes?.devHint;
      try {
        const otpRes = await sendOtp({preAuthToken}).unwrap();
        if (otpRes?.expiresInSec) {
          expiresInSec = otpRes.expiresInSec;
        }
        if (otpRes?.devHint) {
          otpDevHint = otpRes.devHint;
        }
      } catch {
        // phone/login may already trigger OTP; continue with preAuthToken
      }

      navigation.navigate('VerifyOtp', {
        phone: authPhone,
        phoneMasked:
          loginRes?.phoneMasked ?? maskAuthPhone(country, digits),
        preAuthToken,
        expiresInSec,
        devHint: otpDevHint,
      });
    } catch (e: any) {
      setError(e?.data?.message ?? 'Unable to send OTP');
    }
  };

  const onPhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, country.nationalLength);
    setPhone(digits);
  };

  const onSelectCountry = (option: CountryDialOption) => {
    setCountry(option);
    setCountryPickerOpen(false);
    setPhone(prev =>
      prev.replace(/\D/g, '').slice(0, option.nationalLength),
    );
    setError(null);
  };

  return (
    <LoginScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
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

            <Card style={styles.formCard}>
              <View style={styles.cardIconWrap}>
                <PhoneIcon size={22} color={colors.green} />
              </View>
              <Text style={styles.cardTitle}>Login with OTP</Text>
              <Text style={styles.cardDesc}>
                We&apos;ll send a One Time Password to your mobile number
              </Text>

              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryCode}
                  activeOpacity={0.8}
                  onPress={() => setCountryPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Country code ${country.dialCode}`}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryCodeText}>{country.dialCode}</Text>
                  <View style={styles.chevronWrap}>
                    <ChevronRightIcon
                      size={14}
                      color={colors.muted}
                      strokeWidth={2.5}
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor={colors.mutedLight}
                  value={formatNationalPhoneDisplay(
                    phone,
                    country.nationalLength,
                  )}
                  onChangeText={onPhoneChange}
                  keyboardType="phone-pad"
                  maxLength={
                    country.nationalLength === 10
                      ? 11
                      : country.nationalLength + 2
                  }
                />
              </View>

              <Modal
                visible={countryPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setCountryPickerOpen(false)}>
                <Pressable
                  style={styles.countryModalBackdrop}
                  onPress={() => setCountryPickerOpen(false)}>
                  <View style={styles.countryModalSheet}>
                    <Text style={styles.countryModalTitle}>Select country</Text>
                    <FlatList
                      data={COUNTRY_DIAL_OPTIONS}
                      keyExtractor={item => item.code}
                      showsVerticalScrollIndicator={false}
                      style={styles.countryModalList}
                      renderItem={({item}) => {
                        const selected = item.code === country.code;
                        return (
                          <TouchableOpacity
                            style={[
                              styles.countryOption,
                              selected && styles.countryOptionSelected,
                            ]}
                            onPress={() => onSelectCountry(item)}
                            activeOpacity={0.85}>
                            <Text style={styles.countryOptionFlag}>
                              {item.flag}
                            </Text>
                            <View style={styles.countryOptionBody}>
                              <Text style={styles.countryOptionName}>
                                {item.name}
                              </Text>
                              <Text style={styles.countryOptionDial}>
                                {item.dialCode}
                              </Text>
                            </View>
                            {selected ? (
                              <CheckIcon
                                size={20}
                                color={colors.green}
                                strokeWidth={2.5}
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                </Pressable>
              </Modal>

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
                showArrow={false}
              />
            </Card>

            <View style={styles.trustRow}>
              <View style={[styles.trustIconWrap, {backgroundColor: '#DCFCE7'}]}>
                <ShieldIcon size={22} color="#166534" />
              </View>
              <View style={styles.trustDivider} />
              <View style={[styles.trustIconWrap, {backgroundColor: '#FFEDD5'}]}>
                <LockIcon size={22} color="#C2410C" />
              </View>
              <View style={styles.trustDivider} />
              <View style={[styles.trustIconWrap, {backgroundColor: '#DBEAFE'}]}>
                <OtpIcon />
              </View>
            </View>

            <View style={styles.legalRow}>
              <ShieldIcon size={16} color={colors.muted} />
              <Text style={styles.footerHint}>
                By continuing, you agree to our{' '}
                <Text
                  style={styles.link}
                  onPress={() => {
                    void openExternalUrl(termsUrl);
                  }}>
                  Terms & Conditions
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.link}
                  onPress={() => {
                    void openExternalUrl(privacyUrl);
                  }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>

            <Text style={styles.versionText}>Version {getAppVersion()}</Text>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    marginTop: spacing.xxl,
    justifyContent: 'center',
  },
  brand: {
    marginBottom: spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 160,
  },
  tagline: {
    marginTop: -10,
    fontSize: 14,
    fontWeight: '500',
    color: '#5F6981',
    textAlign: 'center',
  },
  headline: {
    ...typography.hero,
    fontSize: 28,
    textAlign: 'center',
    color: colors.navy,
  },
  lead: {
    ...typography.body,
    fontSize: 15,
    marginTop: 7,
    marginBottom: spacing.xl,
    textAlign: 'center',
    color: '#5B647B',
  },
  formCard: {
    padding: 22,
    borderRadius: 22,
  },
  cardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F8ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  cardIcon: {fontSize: 21},
  cardTitle: {
    ...typography.subtitle,
    fontSize: 24,
    textAlign: 'center',
    color: colors.navy,
  },
  cardDesc: {
    ...typography.caption,
    marginTop: 8,
    marginBottom: spacing.lg,
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 14   ,
    color: '#69738A',
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.navy,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EF',
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    gap: 4,
    minWidth: 96,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  chevronWrap: {
    transform: [{rotate: '90deg'}],
    marginLeft: 2,
  },
  countryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  countryModalSheet: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    maxHeight: '70%',
  },
  countryModalTitle: {
    ...typography.subtitle,
    fontSize: 18,
    textAlign: 'center',
    color: colors.navy,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  countryModalList: {
    maxHeight: 360,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countryOptionSelected: {
    backgroundColor: '#E8F8ED',
  },
  countryOptionFlag: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  countryOptionBody: {
    flex: 1,
  },
  countryOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  countryOptionDial: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E4E7EF',
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
  submitBtn: {marginTop: spacing.lg},
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl + 4,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  trustIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E4E7EF',
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
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  link: {
    color: colors.green,
    fontWeight: '600',
  },
  versionText: {
    marginTop: spacing.lg,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedLight,
    textAlign: 'center',
  },
});
