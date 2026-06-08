import React, {useCallback} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, Icon, TopHeader} from '../components/ui';
import type {IconName} from '../components/ui';
import {useGetConfigQuery} from '../services/configApi';
import {openExternalUrl} from '../utils/openExternalUrl';
import {colors, cardShadow, radii, spacing, typography} from '../theme';
import type {ProfileStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ContactSupport'>;

export const ContactSupportScreen: React.FC<Props> = ({navigation}) => {
  const {data: appConfig} = useGetConfigQuery();
  const support = appConfig?.data?.contact_support;

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  const onEmail = useCallback(() => {
    void openExternalUrl(support?.email?.mailto_url);
  }, [support?.email?.mailto_url]);

  const onGmail = useCallback(() => {
    void openExternalUrl(support?.email?.gmail_url);
  }, [support?.email?.gmail_url]);

  const onPhone = useCallback(() => {
    void openExternalUrl(support?.phone?.tel_url);
  }, [support?.phone?.tel_url]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader title="Contact support" onBack={onBack} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Need help with billing, orders, or your account? Reach our support
            team using the options below.
          </Text>

          <SupportChannelCard
            iconName="mail"
            iconBg="#DBEAFE"
            title="Email"
            value={support?.email?.value ?? 'Not configured'}
            hint={
              support?.email?.hint ??
              'Best for detailed questions and attachments'
            }
            actions={[
              {
                label: 'Send email',
                onPress: onEmail,
                disabled: !support?.email?.mailto_url,
              },
              {
                label: 'Open in Gmail',
                onPress: onGmail,
                disabled: !support?.email?.gmail_url,
                secondary: true,
              },
            ]}
          />

          <SupportChannelCard
            iconName="phone"
            iconBg="#DCFCE7"
            title="Phone"
            value={support?.phone?.value ?? 'Not configured'}
            hint={
              support?.phone?.hint ??
              'Call or message during business hours'
            }
            actions={[
              {
                label: 'Call now',
                onPress: onPhone,
                disabled: !support?.phone?.tel_url,
              },
            ]}
          />

          <Card style={styles.tipCard}>
            <Text style={styles.tipTitle}>Before you contact us</Text>
            <Text style={styles.tipBody}>
              Include your outlet name and a short description of the issue.
              Screenshots help us resolve problems faster.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

function SupportChannelCard({
  iconName,
  iconBg,
  title,
  value,
  hint,
  actions,
}: {
  iconName: IconName;
  iconBg: string;
  title: string;
  value: string;
  hint: string;
  actions: Array<{
    label: string;
    onPress: () => void;
    disabled?: boolean;
    secondary?: boolean;
  }>;
}) {
  return (
    <Card style={styles.channelCard}>
      <View style={styles.channelHeader}>
        <View style={[styles.channelIcon, {backgroundColor: iconBg}]}>
          <Icon name={iconName} size={22} color={colors.navy} />
        </View>
        <View style={styles.channelBody}>
          <Text style={styles.channelTitle}>{title}</Text>
          <Text style={styles.channelValue}>{value}</Text>
          <Text style={styles.channelHint}>{hint}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.actionBtn,
              action.secondary && styles.actionBtnSecondary,
              action.disabled && styles.actionBtnDisabled,
            ]}
            onPress={action.onPress}
            disabled={action.disabled}
            activeOpacity={0.88}>
            <Text
              style={[
                styles.actionBtnText,
                action.secondary && styles.actionBtnTextSecondary,
                action.disabled && styles.actionBtnTextDisabled,
              ]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  safe: {flex: 1},
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  intro: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  channelCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  channelHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBody: {flex: 1},
  channelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  channelValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  channelHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnTextSecondary: {
    color: colors.navy,
  },
  actionBtnTextDisabled: {
    color: colors.muted,
  },
  tipCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  tipBody: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
    color: '#A16207',
  },
});
