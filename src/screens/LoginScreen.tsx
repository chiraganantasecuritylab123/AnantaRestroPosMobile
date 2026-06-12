import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
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
  getPhoneCountryCode,
  maskAuthPhone,
  type CountryDialOption,
} from '../utils/countryDialCodes';
import {
  resolvePrivacyUrl,
  resolveTermsUrl,
  useGetConfigQuery,
} from '../services/configApi';
import {openExternalUrl} from '../utils/openExternalUrl';
import {triggerTapHaptic} from '../utils/tapHaptic';
import {getAppVersion} from '../constants/appVersion';
import {
  maxContentWidth,
  moderateScale,
  scale,
  useBrandLogoSize,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function OtpIcon() {
  const iconSize = moderateScale(22);
  return (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
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
  // const [phone, setPhone] = useState(__DEV__ ? '9876123456' : '');
  const [phone, setPhone] = useState(__DEV__ ? '1231231233' : '');
  const [country, setCountry] = useState<CountryDialOption>(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneLogin, {isLoading: loggingIn}] = usePhoneLoginMutation();
  const [sendOtp, {isLoading: sendingOtp}] = useSendOtpMutation();
  const {data: appConfig} = useGetConfigQuery();
  const logoSize = useBrandLogoSize();
  const {height: screenH} = useWindowDimensions();
  const compact = screenH < verticalScale(680);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewHeightRef = useRef(0);
  const footerBottomInWrapRef = useRef(0);
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
        ? verticalScale(8) + verticalScale(4)
        : verticalScale(24) + verticalScale(8);
      const footerBottom = scrollPaddingTop + footerBottomInWrap;
      const bottomInset = verticalScale(30);
      const targetY = Math.max(0, footerBottom - viewHeight + bottomInset);
      scrollRef.current?.scrollTo({y: targetY, animated: true});
    });
  }, [keyboardOpen]);

  useEffect(() => {
    keyboardOpenRef.current = keyboardOpen;
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

  const termsUrl = resolveTermsUrl(appConfig?.data);
  const privacyUrl = resolvePrivacyUrl(appConfig?.data);

  const isLoading = loggingIn || sendingOtp;

  const handleSendOtpPress = () => {
    triggerTapHaptic();
    void onSendOtp();
  };

  const onSendOtp = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== country.nationalLength) {
      setError(
        `Enter a valid ${country.nationalLength}-digit mobile number`,
      );
      return;
    }

    const authPhone = buildAuthPhone(country, digits);
    const phoneCountryCode = getPhoneCountryCode(country);

    try {
      const loginRes = await phoneLogin({
        phone: authPhone,
        phone_country_code: phoneCountryCode,
      }).unwrap();
      if (!loginRes?.success) {
        setError(loginRes?.message ?? 'Unable to send OTP');
        return;
      }

      const preAuthToken = loginRes?.preAuthToken;
      if (!preAuthToken) {
        setError('Missing session token. Please try again.');
        return;
      }

      const flow =
        loginRes.flow ?? (loginRes.isNewUser ? 'register' : 'login');
      const expiryMinutes = loginRes.otpPolicy?.expiryMinutes ?? 5;
      let expiresInSec = expiryMinutes * 60;
      let otpDevHint = loginRes?.devHint;

      if (!loginRes.devHint) {
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
      }

      navigation.navigate('VerifyOtp', {
        phone: authPhone,
        phoneCountryCode,
        phoneMasked:
          loginRes?.phoneMasked ?? maskAuthPhone(country, digits),
        preAuthToken,
        flow,
        expiresInSec,
        devHint: '',
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
            {!keyboardOpen ? (
              <View style={[styles.brand, compact && styles.brandCompact]}>
                <Image
                  source={require('../assets/splash-screen-logo.png')}
                  style={[styles.logo, logoSize]}
                  resizeMode="contain"
                  accessibilityLabel="Ananta POS logo"
                />
                <Text style={[styles.tagline, compact && styles.taglineCompact]}>
                  Smart Billing. Complete Business Control.
                </Text>
              </View>
            ) : null}

            <Card style={compact ? styles.formCardCompact : styles.formCard}>
              <View style={styles.cardIconWrap}>
                <PhoneIcon size={moderateScale(22)} color={colors.green} />
              </View>
              <Text style={styles.cardTitle}>Login or Sign Up</Text>
              <Text style={styles.cardDesc}>
                Enter your mobile number. We&apos;ll send an OTP to sign in or
                create a new account.
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
                      size={moderateScale(14)}
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
                  onFocus={scrollToKeyboardBottom}
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
                                size={moderateScale(20)}
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
                onPress={handleSendOtpPress}
                loading={isLoading}
                style={styles.submitBtn}
                showArrow={false}
              />
            </Card>

            <View style={[styles.trustRow, compact && styles.trustRowCompact]}>
              <View style={[styles.trustIconWrap, {backgroundColor: '#DCFCE7'}]}>
                <ShieldIcon size={moderateScale(22)} color="#166534" />
              </View>
              <View style={styles.trustDivider} />
              <View style={[styles.trustIconWrap, {backgroundColor: '#FFEDD5'}]}>
                <LockIcon size={moderateScale(22)} color="#C2410C" />
              </View>
              <View style={styles.trustDivider} />
              <View style={[styles.trustIconWrap, {backgroundColor: '#DBEAFE'}]}>
                <OtpIcon />
              </View>
            </View>

            <View style={styles.legalRow}>
              <ShieldIcon size={moderateScale(16)} color={colors.muted} />
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

            <View
              onLayout={e => {
                const {y, height} = e.nativeEvent.layout;
                footerBottomInWrapRef.current = y + height;
                if (keyboardOpenRef.current) {
                  scrollToKeyboardBottom();
                }
              }}>
              <Text style={styles.versionText}>Version {getAppVersion()}</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: verticalScale(8),
    paddingBottom: spacing.xl,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  scrollKeyboardOpen: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(4),
    paddingBottom: spacing.lg,
  },
  contentWrap: {
    width: '100%',
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
  },
  brand: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  brandCompact: {
    marginBottom: spacing.md,
  },
  logo: {
    alignSelf: 'center',
  },
  tagline: {
    marginTop: verticalScale(20),
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#5F6981',
    textAlign: 'center',
    lineHeight: moderateScale(18),
    paddingHorizontal: spacing.sm,
    flexShrink: 1,
  },
  taglineCompact: {
    marginTop: spacing.xs,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(16),
  },
  headline: {
    ...typography.hero,
    fontSize: moderateScale(28),
    textAlign: 'center',
    color: colors.navy,
  },
  lead: {
    ...typography.body,
    fontSize: moderateScale(15),
    marginTop: verticalScale(7),
    marginBottom: spacing.xl,
    textAlign: 'center',
    color: '#5B647B',
  },
  formCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(22),
  },
  formCardCompact: {
    padding: moderateScale(16),
    borderRadius: moderateScale(22),
  },
  cardIconWrap: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(23),
    backgroundColor: '#E8F8ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  cardIcon: {fontSize: moderateScale(21)},
  cardTitle: {
    ...typography.subtitle,
    fontSize: moderateScale(20),
    textAlign: 'center',
    color: colors.navy,
  },
  cardDesc: {
    ...typography.caption,
    marginTop: verticalScale(8),
    marginBottom: spacing.lg,
    lineHeight: moderateScale(22),
    textAlign: 'center',
    fontSize: moderateScale(14),
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
    paddingVertical: verticalScale(14),
    gap: scale(4),
    minWidth: scale(96),
    flexShrink: 0,
  },
  countryFlag: {
    fontSize: moderateScale(18),
  },
  countryCodeText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.navy,
  },
  chevronWrap: {
    transform: [{rotate: '90deg'}],
    marginLeft: scale(2),
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
    width: '100%',
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
  },
  countryModalTitle: {
    ...typography.subtitle,
    fontSize: moderateScale(18),
    textAlign: 'center',
    color: colors.navy,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  countryModalList: {
    maxHeight: verticalScale(360),
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
    fontSize: moderateScale(22),
    width: scale(32),
    textAlign: 'center',
  },
  countryOptionBody: {
    flex: 1,
    flexShrink: 1,
  },
  countryOptionName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
  },
  countryOptionDial: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
  },
  phoneDivider: {
    width: StyleSheet.hairlineWidth,
    height: verticalScale(28),
    backgroundColor: '#E4E7EF',
  },
  phoneInput: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(16),
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
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  submitBtn: {marginTop: spacing.lg},
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  trustRowCompact: {
    marginTop: spacing.md,
  },
  trustIconWrap: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustDivider: {
    width: StyleSheet.hairlineWidth,
    height: verticalScale(32),
    backgroundColor: '#E4E7EF',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  legalShield: {fontSize: moderateScale(14), marginTop: verticalScale(2)},
  footerHint: {
    flex: 1,
    flexShrink: 1,
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(18),
  },
  link: {
    color: colors.green,
    fontWeight: '600',
  },
  versionText: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.mutedLight,
    textAlign: 'center',
  },
});
