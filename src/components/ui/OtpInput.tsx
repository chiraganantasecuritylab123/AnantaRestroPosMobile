import React, {useEffect, useRef} from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import {colors, radii} from '../../theme';

const OTP_LENGTH = 6;

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Fires once when 6 digits are entered (typing, paste, or SMS autofill). */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
};

export const OtpInput: React.FC<Props> = ({
  value,
  onChange,
  onComplete,
  autoFocus = true,
}) => {
  const inputs = useRef<Array<TextInput | null>>([]);
  const hiddenInputRef = useRef<TextInput | null>(null);
  const digits = value.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);

  const emitChange = (next: string) => {
    const cleaned = next.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(cleaned);
    if (cleaned.length === OTP_LENGTH) {
      onComplete?.(cleaned);
    }
  };

  const updateAt = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    emitChange(next.join('').replace(/\s/g, ''));
  };

  const onChangeText = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) {
      updateAt(index, '');
      return;
    }
    if (cleaned.length > 1) {
      emitChange(cleaned);
      const focusIdx = Math.min(cleaned.length, OTP_LENGTH - 1);
      inputs.current[focusIdx]?.focus();
      return;
    }
    updateAt(index, cleaned);
    if (index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      updateAt(index - 1, '');
    }
  };

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    const timer = setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={hiddenInputRef}
        style={styles.hiddenAutofill}
        value={value}
        onChangeText={emitChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'off'}
        importantForAutofill="yes"
        caretHidden
        accessibilityLabel="OTP autofill"
      />
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const focused = value.length === index;
          const filled = !!digit;
          return (
            <View
              key={index}
              style={[
                styles.box,
                focused && styles.boxFocused,
                filled && !focused && styles.boxFilled,
              ]}>
              <TextInput
                ref={ref => {
                  inputs.current[index] = ref;
                }}
                style={styles.input}
                value={digit}
                onChangeText={t => onChangeText(index, t)}
                onKeyPress={e => onKeyPress(index, e)}
                onFocus={() => hiddenInputRef.current?.focus()}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={index === 0 ? 'sms-otp' : 'off'}
                importantForAutofill={index === 0 ? 'yes' : 'no'}
                accessibilityLabel={`OTP digit ${index + 1}`}
              />
              {!digit ? <Text style={styles.placeholder}>−</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const BOX = 48;

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  hiddenAutofill: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    top: 0,
    left: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: colors.border,
  },
  input: {
    ...StyleSheet.absoluteFillObject,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
    padding: 0,
  },
  placeholder: {
    fontSize: 18,
    color: colors.mutedLight,
    fontWeight: '400',
    pointerEvents: 'none',
  },
});
