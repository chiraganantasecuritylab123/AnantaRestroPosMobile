import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, radii, spacing} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog: React.FC<Props> = ({
  visible,
  title,
  message,
  confirmLabel = 'Exit',
  cancelLabel = 'Stay',
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}>
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.85}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              destructive && styles.confirmBtnDestructive,
            ]}
            onPress={onConfirm}
            activeOpacity={0.85}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const ICON_SIZE = moderateScale(56);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: moderateScale(14),
    lineHeight: verticalScale(20),
    color: colors.muted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.navy,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.white,
  },
});
