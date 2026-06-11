import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSignoutMutation} from '../services/authApi';
import {useAppDispatch, useAppSelector} from '../useAppHooks';
import {performAppLogout} from '../store';
import {LogOutIcon, ShieldIcon} from './ui';
import {colors, radii, spacing, typography} from '../theme';
import {moderateScale, scale, verticalScale} from '../utils/responsive';

export const SubscriptionBlockedModal: React.FC = () => {
  const message = useAppSelector(
    state => state.authToken.subscriptionBlockMessage,
  );
  const dispatch = useAppDispatch();
  const [signout, {isLoading}] = useSignoutMutation();

  const onLogout = useCallback(
    () => performAppLogout(dispatch, () => signout().unwrap()),
    [dispatch, signout],
  );

  if (!message) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Block Android back — only logout is allowed.
      }}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <ShieldIcon size={moderateScale(28)} color={colors.orange} />
          </View>
          <Text style={styles.title}>Subscription inactive</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.logoutBtn, isLoading && styles.logoutBtnDisabled]}
            onPress={() => {
              void onLogout();
            }}
            disabled={isLoading}
            activeOpacity={0.85}>
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <LogOutIcon size={moderateScale(18)} color={colors.white} />
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: scale(340),
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    marginBottom: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    width: '100%',
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    backgroundColor: colors.error,
  },
  logoutBtnDisabled: {
    opacity: 0.75,
  },
  logoutText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.white,
  },
});
