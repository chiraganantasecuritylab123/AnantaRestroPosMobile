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

export type AppDialogButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppDialogButton[];
  onDismiss: (button: AppDialogButton) => void;
};

export const AppDialog: React.FC<Props> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
}) => {
  const cancelButton = buttons.find(b => b.style === 'cancel');
  const actionButtons = buttons.filter(b => b.style !== 'cancel');
  const useHorizontal = buttons.length === 2;

  const renderButton = (button: AppDialogButton, layout: 'row' | 'stack') => {
    const isCancel = button.style === 'cancel';
    const isDestructive = button.style === 'destructive';

    return (
      <TouchableOpacity
        key={button.text}
        style={[
          layout === 'row' ? styles.rowBtn : styles.stackBtn,
          isCancel && styles.cancelBtn,
          !isCancel && !isDestructive && styles.primaryBtn,
          isDestructive && styles.destructiveBtn,
        ]}
        onPress={() => onDismiss(button)}
        activeOpacity={0.85}>
        <Text
          style={[
            styles.btnText,
            isCancel && styles.cancelText,
            !isCancel && !isDestructive && styles.primaryText,
            isDestructive && styles.destructiveText,
          ]}>
          {button.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (cancelButton) {
          onDismiss(cancelButton);
        } else if (buttons[0]) {
          onDismiss(buttons[0]);
        }
      }}>
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (cancelButton) {
            onDismiss(cancelButton);
          }
        }}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {useHorizontal ? (
            <View style={styles.rowActions}>
              {cancelButton ? renderButton(cancelButton, 'row') : null}
              {actionButtons.map(b => renderButton(b, 'row'))}
            </View>
          ) : buttons.length === 1 ? (
            <View style={styles.singleAction}>
              {renderButton(buttons[0], 'stack')}
            </View>
          ) : (
            <View style={styles.stackActions}>
              {buttons.map(b => renderButton(b, 'stack'))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
  rowActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
    width: '100%',
  },
  singleAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  stackActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    width: '100%',
  },
  rowBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  stackBtn: {
    width: '100%',
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background,
  },
  primaryBtn: {
    backgroundColor: colors.green,
  },
  destructiveBtn: {
    backgroundColor: colors.error,
  },
  btnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  cancelText: {
    color: colors.navy,
  },
  primaryText: {
    color: colors.white,
  },
  destructiveText: {
    color: colors.white,
  },
});
