import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {CheckIcon, ChevronRightIcon} from './icons';
import {colors, radii, spacing} from '../../theme';
import {
  COUNTRY_DIAL_OPTIONS,
  formatNationalPhoneDisplay,
  type CountryDialOption,
} from '../../utils/countryDialCodes';
import {maxContentWidth, moderateScale, scale, verticalScale} from '../../utils/responsive';

type Props = {
  label?: string;
  country: CountryDialOption;
  onCountryChange: (country: CountryDialOption) => void;
  phone: string;
  onPhoneChange: (digits: string) => void;
  placeholder?: string;
  labelStyle?: TextStyle;
  style?: ViewStyle;
  borderRadius?: number;
};

export const PhoneCountryInput: React.FC<Props> = ({
  label,
  country,
  onCountryChange,
  phone,
  onPhoneChange,
  placeholder = 'Enter mobile number',
  labelStyle,
  style,
  borderRadius = radii.md,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePhoneChange = (text: string) => {
    onPhoneChange(text.replace(/\D/g, '').slice(0, country.nationalLength));
  };

  const handleSelectCountry = (option: CountryDialOption) => {
    onCountryChange(option);
    setPickerOpen(false);
    onPhoneChange(phone.replace(/\D/g, '').slice(0, option.nationalLength));
  };

  return (
    <>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={[styles.phoneRow, {borderRadius}, style]}>
        <TouchableOpacity
          style={styles.countryCode}
          activeOpacity={0.8}
          onPress={() => setPickerOpen(true)}
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
          placeholder={placeholder}
          placeholderTextColor={colors.mutedLight}
          value={formatNationalPhoneDisplay(phone, country.nationalLength)}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={
            country.nationalLength === 10
              ? 11
              : country.nationalLength + 2
          }
        />
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerOpen(false)}>
          <Pressable onPress={() => {}}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Select country</Text>
              <FlatList
                data={COUNTRY_DIAL_OPTIONS}
                keyExtractor={item => item.code}
                showsVerticalScrollIndicator={false}
                style={styles.modalList}
                renderItem={({item}) => {
                  const selected = item.code === country.code;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.countryOption,
                        selected && styles.countryOptionSelected,
                      ]}
                      onPress={() => handleSelectCountry(item)}
                      activeOpacity={0.85}>
                      <Text style={styles.countryOptionFlag}>{item.flag}</Text>
                      <View style={styles.countryOptionBody}>
                        <Text style={styles.countryOptionName}>{item.name}</Text>
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
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.sm,
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.navy,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: verticalScale(12),
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
  phoneDivider: {
    width: StyleSheet.hairlineWidth,
    height: verticalScale(28),
    backgroundColor: colors.border,
  },
  phoneInput: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: colors.navy,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    maxHeight: '70%',
    width: '100%',
    maxWidth: maxContentWidth(),
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    textAlign: 'center',
    color: colors.navy,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalList: {
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
});
