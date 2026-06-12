import {Platform} from 'react-native';
import {VolumeManager} from 'react-native-volume-manager';

/** Below this level (0–1), volume is raised to max when a notification arrives. */
const LOW_VOLUME_THRESHOLD = 0.5;
const MAX_VOLUME = 1;

export async function ensureNotificationAudibleVolume(): Promise<void> {
  try {
    await VolumeManager.showNativeVolumeUI({enabled: false});

    if (Platform.OS === 'ios') {
      await VolumeManager.enableInSilenceMode(true);
    }

    const {volume} = await VolumeManager.getVolume();
    if (volume >= LOW_VOLUME_THRESHOLD) {
      return;
    }

    await VolumeManager.setVolume(MAX_VOLUME, {
      showUI: false,
      playSound: false,
      type: 'music',
    });

    if (Platform.OS === 'android') {
      await VolumeManager.setVolume(MAX_VOLUME, {
        showUI: false,
        playSound: false,
        type: 'notification',
      });
    }
  } catch {
    // Optional; ignore volume control errors on unsupported devices.
  }
}
