/**
 * Background FCM handler — must be imported from index.js before AppRegistry.
 */
import messaging from '@react-native-firebase/messaging';
import {persistPushNotification} from '../storage/notificationsStorage';
import {refreshNotificationsCache} from '../services/notificationsSync';
import {store} from '../store';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  await persistPushNotification(remoteMessage);
  refreshNotificationsCache(store.dispatch);
});
