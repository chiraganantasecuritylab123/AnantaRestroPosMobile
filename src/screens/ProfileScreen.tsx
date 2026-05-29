import React, {useMemo} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useSignoutMutation} from '../services/authApi';
import {logout} from '../features/authTokenSlice';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {Card, ScreenBackground} from '../components/ui';
import {colors, radii, spacing, typography} from '../theme';

export const ProfileScreen: React.FC = () => {
  const user = useAppSelector(state => state.authToken.user);
  const [signout] = useSignoutMutation();
  const dispatch = useAppDispatch();

  const initials = useMemo(() => {
    const n = user?.name ?? 'Waiter';
    return n
      .split(' ')
      .map(s => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const onLogout = async () => {
    try {
      await signout().unwrap();
    } catch {
      // local logout always runs even if network fails.
    } finally {
      dispatch(logout());
    }
  };

  const scopePreview = user?.scope
    ? user.scope.split(',').slice(0, 4).join(', ') + '…'
    : '—';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.title}>Profile</Text>

          <LinearGradient
            colors={[...colors.gradientHero]}
            style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.heroName}>{user?.name ?? 'Team member'}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {(user?.role ?? 'waiter').replace(/_/g, ' ')}
              </Text>
            </View>
            {user?.designation ? (
              <Text style={styles.designation}>{user.designation}</Text>
            ) : null}
          </LinearGradient>

          <Text style={styles.sectionLabel}>Contact</Text>
          <Card style={styles.infoCard}>
            <ProfileRow label="Email" value={user?.email ?? '—'} />
            <View style={styles.divider} />
            <ProfileRow label="Phone" value={user?.phone ?? '—'} />
            <View style={styles.divider} />
            <ProfileRow label="Username" value={user?.username ?? '—'} mono />
          </Card>

          <Text style={styles.sectionLabel}>Access</Text>
          <Card style={styles.infoCard}>
            <Text style={styles.scopeHint}>Scopes (preview)</Text>
            <Text style={styles.scopeText}>{scopePreview}</Text>
          </Card>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={onLogout}
            activeOpacity={0.92}>
            <Text style={styles.logoutBtnText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Signing out clears your session on this device. You will need to
            sign in again to use POS.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

function ProfileRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl},
  kicker: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    marginTop: 4,
  },
  heroCard: {
    marginTop: spacing.xl,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {fontSize: 28, fontWeight: '800', color: colors.white},
  heroName: {
    marginTop: spacing.lg,
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  rolePill: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  rolePillText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  designation: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoCard: {
    padding: spacing.lg,
  },
  row: {paddingVertical: 4},
  rowLabel: {fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6},
  rowValue: {fontSize: 16, fontWeight: '600', color: colors.navy},
  rowValueMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  scopeHint: {fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8},
  scopeText: {fontSize: 13, lineHeight: 20, color: colors.navy},
  logoutBtn: {
    marginTop: spacing.xxl,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.white,
  },
  logoutBtnText: {color: colors.error, fontSize: 17, fontWeight: '800'},
  footer: {
    marginTop: spacing.lg,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
