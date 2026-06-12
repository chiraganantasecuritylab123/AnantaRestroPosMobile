/**
 * Notifee background press handler — import from index.js before AppRegistry.
 */
import notifee, {EventType} from '@notifee/react-native';
import {navigateFromNotificationPayload} from '../navigation/notificationNavigation';

notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    navigateFromNotificationPayload(detail.notification?.data ?? undefined);
  }
});
