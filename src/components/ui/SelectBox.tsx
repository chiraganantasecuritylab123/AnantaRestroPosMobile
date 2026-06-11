import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ChevronRightIcon, CloseIcon} from './icons';
import {colors, radii, spacing} from '../../theme';
import {moderateScale, scale, verticalScale} from '../../utils/responsive';

export type SelectBoxOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string | null;
  options: SelectBoxOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyHint?: string;
  errorHint?: string;
  onRetry?: () => void;
};

export const SelectBox: React.FC<Props> = ({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
  emptyHint,
  errorHint,
  onRetry,
}) => {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find(option => option.id === value) ?? null,
    [options, value],
  );

  const canOpen = !disabled && !loading && options.length > 0;

  return (
    <View style={styles.root}>
      <Text style={styles.fieldLabel}>{label}</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : errorHint ? (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.errorHint}>{errorHint}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.selectBtn,
            disabled && styles.selectBtnDisabled,
            !canOpen && !disabled && styles.selectBtnDisabled,
          ]}
          onPress={() => {
            if (canOpen) {
              setOpen(true);
            }
          }}
          disabled={!canOpen}
          activeOpacity={0.85}>
          <View style={styles.selectBtnBody}>
            <Text
              style={[
                styles.selectBtnText,
                !selected && styles.selectBtnPlaceholder,
              ]}
              numberOfLines={1}>
              {selected?.label ?? placeholder}
            </Text>
            {selected?.subtitle ? (
              <Text style={styles.selectBtnSubtitle} numberOfLines={1}>
                {selected.subtitle}
              </Text>
            ) : null}
          </View>
          <ChevronRightIcon
            size={moderateScale(18)}
            color={canOpen ? colors.muted : colors.mutedLight}
          />
        </TouchableOpacity>
      )}

      {!loading && !errorHint && options.length === 0 && emptyHint ? (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setOpen(false)}
                hitSlop={scale(8)}>
                <CloseIcon size={moderateScale(22)} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.optionList}
              renderItem={({item}) => {
                const active = item.id === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    activeOpacity={0.85}>
                    <View style={styles.optionBody}>
                      <Text
                        style={[
                          styles.optionLabel,
                          active && styles.optionLabelActive,
                        ]}
                        numberOfLines={2}>
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.optionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Text style={styles.optionCheck}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.muted,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    minHeight: verticalScale(48),
  },
  selectBtnDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.85,
  },
  selectBtnBody: {
    flex: 1,
    minWidth: 0,
  },
  selectBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
  },
  selectBtnPlaceholder: {
    color: colors.mutedLight,
    fontWeight: '500',
  },
  selectBtnSubtitle: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    fontWeight: '500',
  },
  loadingWrap: {
    minHeight: verticalScale(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  emptyHint: {
    fontSize: moderateScale(13),
    color: colors.muted,
    lineHeight: moderateScale(18),
  },
  errorHint: {
    fontSize: moderateScale(13),
    color: colors.error,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: scale(40),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
  },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    backgroundColor: colors.white,
  },
  optionRowActive: {
    borderColor: colors.green,
    backgroundColor: '#F0FDF4',
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
  },
  optionLabelActive: {
    color: colors.greenDark,
    fontWeight: '800',
  },
  optionSubtitle: {
    marginTop: verticalScale(2),
    fontSize: moderateScale(12),
    color: colors.muted,
    textTransform: 'capitalize',
  },
  optionCheck: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.green,
  },
});
