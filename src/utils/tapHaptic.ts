import {Platform, Vibration} from 'react-native';

/** Short tap feedback for primary buttons (Android ms / iOS default). */
export function triggerTapHaptic(durationMs = 50): void {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(durationMs);
    } else {
      Vibration.vibrate();
    }
  } catch {
    // Optional feedback; ignore if vibration is unavailable.
  }
}
