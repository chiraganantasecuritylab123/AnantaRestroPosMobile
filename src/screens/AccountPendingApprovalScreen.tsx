import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Card,
  GradientButton,
  LoginScreenBackground,
  ShieldIcon,
} from '../components/ui';
import { colors, radii, spacing, typography } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import {
  maxContentWidth,
  moderateScale,
  useBrandLogoSize,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'AccountPendingApproval'
>;

export const AccountPendingApprovalScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { message } = route.params;
  const logoSize = useBrandLogoSize();

  return (
    <LoginScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Image
            source={require('../assets/splash-screen-logo.png')}
            style={[styles.logo, logoSize]}
            resizeMode="contain"
          />

          <Card style={styles.card}>
            <View style={styles.iconWrap}>
              <ShieldIcon size={moderateScale(28)} color={colors.orange} />
            </View>
            <Text style={styles.title}>Account Created Successfully</Text>
            <Text style={styles.message}>{message}</Text>
          </Card>

          <GradientButton
            title="Back to Login"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
            showArrow={false}
            style={styles.btn}
          />
        </View>
      </SafeAreaView>
    </LoginScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
    width: '100%',
  },
  logo: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    width: '100%',
    padding: moderateScale(24),
    alignItems: 'center',
  },
  iconWrap: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontSize: moderateScale(20),
    textAlign: 'center',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: moderateScale(15),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: moderateScale(13),
    color: colors.mutedLight,
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  btn: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
