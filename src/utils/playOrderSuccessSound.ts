import SoundPlayer from 'react-native-sound-player';

const ORDER_SUCCESS_SOUND = require('../assets/sounds/order-success.mp3');
const ORDER_NOTIFICATION_SOUND = require('../assets/sounds/notification.mp3');

export function playOrderSuccessSound(): void {
  try {
    SoundPlayer.playAsset(ORDER_SUCCESS_SOUND);
  } catch {
    // Optional feedback; ignore playback errors.
  }
}

export function playOrderNotificationSound(): void {
  try {
    SoundPlayer.playAsset(ORDER_NOTIFICATION_SOUND);
  } catch {
    // Optional feedback; ignore playback errors.
  }
}
