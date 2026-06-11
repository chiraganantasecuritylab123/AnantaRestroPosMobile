import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  type SignupBusinessType,
  useSignupCompleteMutation,
} from '../services/authApi';
import { useAppDispatch } from '../useAppHooks';
import { setAuth } from '../features/authTokenSlice';
import {
  Card,
  ChevronLeftIcon,
  GradientButton,
  LoginScreenBackground,
  ShieldIcon,
} from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import {
  maxContentWidth,
  moderateScale,
  scale,
  useBrandLogoSize,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignupComplete'>;

const BUSINESS_TYPES: { key: SignupBusinessType; label: string }[] = [
  { key: 'dine_in', label: 'Dine-in' },
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'both', label: 'Both' },
];

type FieldErrors = {
  bizName?: string;
  email?: string;
};

function validateFields(bizName: string, email: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = bizName.trim();

  if (!trimmedName) {
    errors.bizName = 'Business name is required';
  } else if (trimmedName.length < 2) {
    errors.bizName = 'Business name must be at least 2 characters';
  } else if (trimmedName.length > 100) {
    errors.bizName = 'Business name must be under 100 characters';
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

export const SignupCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { preAuthToken, phoneMasked } = route.params;
  const dispatch = useAppDispatch();
  const logoSize = useBrandLogoSize();
  const [bizName, setBizName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] =
    useState<SignupBusinessType>('dine_in');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [signupComplete, { isLoading }] = useSignupCompleteMutation();

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onSubmit = async () => {
    setApiError(null);
    const trimmedName = bizName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const validationErrors = validateFields(bizName, email);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});

    try {
      const res = await signupComplete({
        preAuthToken,
        biz_name: trimmedName,
        email: trimmedEmail,
        business_type: businessType,
      }).unwrap();

      if (!res?.success) {
        setApiError(res?.message ?? 'Unable to complete signup');
        return;
      }

      if (res.requiresApproval) {
        navigation.replace('AccountPendingApproval', {
          message:
            res.message ??
            'Your account is pending approval. You can sign in once approved.',
        });
        return;
      }

      if (res.accessToken) {
        dispatch(
          setAuth({
            token: res.accessToken,
            user: res.user ?? null,
          }),
        );
        return;
      }

      navigation.replace('AccountPendingApproval', {
        message:
          res.message ??
          'Account created. Please wait for approval before signing in.',
      });
    } catch (e: any) {
      setApiError(e?.data?.message ?? 'Unable to complete signup');
    }
  };

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? moderateScale(8) : 0}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrap}>
              <View style={styles.brand}>
                <Image
                  source={require('../assets/logo-dark.png')}
                  style={[styles.logo, ]}
                  resizeMode="contain"
                />
              </View>

              <Card style={styles.formCard}>
                <Text style={styles.cardTitle}>Complete Your Sign Up</Text>
                <Text style={styles.cardDesc}>
                  Tell us about your business to create your account.
                </Text>

                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={styles.fieldLabel}>Business Name</Text><Text style={styles.starText}>*</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.bizName ? styles.inputError : null,
                    ]}
                    placeholder="e.g. Ananta Cafe"
                    placeholderTextColor={colors.mutedLight}
                    value={bizName}
                    onChangeText={text => {
                      setBizName(text);
                      clearFieldError('bizName');
                    }}
                    onBlur={() => {
                      const next = validateFields(bizName, email);
                      if (next.bizName) {
                        setFieldErrors(prev => ({ ...prev, bizName: next.bizName }));
                      }
                    }}
                    autoCapitalize="words"
                  />
                  {fieldErrors.bizName ? (
                    <Text style={styles.fieldError}>{fieldErrors.bizName}</Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={styles.fieldLabel}>Email</Text><Text style={styles.starText}>*</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.email ? styles.inputError : null,
                    ]}
                    placeholder="you@business.com"
                    placeholderTextColor={colors.mutedLight}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      clearFieldError('email');
                    }}
                    onBlur={() => {
                      const next = validateFields(bizName, email);
                      if (next.email) {
                        setFieldErrors(prev => ({ ...prev, email: next.email }));
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {fieldErrors.email ? (
                    <Text style={styles.fieldError}>{fieldErrors.email}</Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput
                    style={[styles.input, styles.inputReadOnly]}
                    readOnly
                    editable={false}
                    value={phoneMasked}
                  />
                </View>

                <Text style={styles.fieldLabel}>Business Type</Text>
                <View style={styles.typeRow}>
                  {BUSINESS_TYPES.map(option => {
                    const selected = businessType === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.typeChip,
                          selected && styles.typeChipSelected,
                        ]}
                        onPress={() => setBusinessType(option.key)}
                        activeOpacity={0.85}>
                        <Text
                          style={[
                            styles.typeChipText,
                            selected && styles.typeChipTextSelected,
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {apiError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{apiError}</Text>
                  </View>
                ) : null}

                <GradientButton
                  title="Create Account"
                  onPress={onSubmit}
                  loading={isLoading}
                  showArrow={false}
                  style={styles.submitBtn}
                />
              </Card>

              <View style={styles.noteRow}>
                <ShieldIcon size={moderateScale(16)} color={colors.muted} />
                <Text style={styles.noteText}>
                  New accounts may require admin approval before you can sign in.
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
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: verticalScale(48),
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: maxContentWidth(),
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    alignSelf: 'center',
  },
  phoneLabel: {
    marginTop: spacing.sm,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  formCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(22),
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: moderateScale(20),
    textAlign: 'center',
    color: colors.navy,
  },
  cardDesc: {
    marginTop: verticalScale(8),
    marginBottom: spacing.lg,
    fontSize: moderateScale(14),
    color: '#69738A',
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.navy,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E7EF',
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(16),
    color: colors.navy,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: colors.errorBg,
  },
  inputReadOnly: {
    backgroundColor: colors.borderLight,
    color: colors.muted,
  },
  fieldError: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: colors.error,
    lineHeight: moderateScale(16),
  },
  starText: {
    color: colors.error,
    position: "relative",
    top: -verticalScale(5),
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeChipSelected: {
    borderColor: colors.green,
    backgroundColor: '#E8F8ED',
  },
  typeChipText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.muted,
  },
  typeChipTextSelected: {
    color: colors.green,
  },
  errorBanner: {
    marginBottom: spacing.md,
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
  submitBtn: {
    marginTop: spacing.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  noteText: {
    flex: 1,
    flexShrink: 1,
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(18),
  },
});
