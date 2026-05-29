import React, {useRef} from 'react';
import {
  NativeSyntheticEvent,
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
};

export const OtpInput: React.FC<Props> = ({value, onChange}) => {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = value.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);

  const updateAt = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join('').replace(/\s/g, '').slice(0, OTP_LENGTH));
  };

  const onChangeText = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) {
      updateAt(index, '');
      return;
    }
    if (cleaned.length > 1) {
      const merged = (value + cleaned).replace(/\D/g, '').slice(0, OTP_LENGTH);
      onChange(merged);
      const focusIdx = Math.min(merged.length, OTP_LENGTH - 1);
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

  return (
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
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
              accessibilityLabel={`OTP digit ${index + 1}`}
            />
            {!digit ? <Text style={styles.placeholder}>−</Text> : null}
          </View>
        );
      })}
    </View>
  );
};

const BOX = 48;

const styles = StyleSheet.create({
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
