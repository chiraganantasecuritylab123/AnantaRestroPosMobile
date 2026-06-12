import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import {PermissionsAndroid, Platform} from 'react-native';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {FCM_DEVICE_TYPE} from './fcmApi';
import {
  persistPushNotification,
  type StoredPushNotification,
} from '../storage/notificationsStorage';
import {normalizeNotificationData} from '../navigation/notificationNavigation';
import {playOrderNotificationSoundIfNeeded} from '../utils/orderNotificationSound';
import {ensureNotificationAudibleVolume} from '../utils/notificationVolume';

/** Silent channel — no default system notification sound. */
const ANDROID_CHANNEL_ID = 'pos_silent';

export function getRemoteMessageContent(
  message: FirebaseMessagingTypes.RemoteMessage,
): {title: string; body: string} {
  const title =
    message.notification?.title ?? message.data?.title ?? 'Notification';
  const body = message.notification?.body ?? message.data?.body ?? '';
  return {title, body};
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'POS notifications',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
}

export async function configureForegroundPresentation(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  await messaging().setForegroundPresentationOptions({
    alert: true,
    badge: true,
    sound: false,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const status = await messaging().requestPermission();
  const enabled =
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL;

  if (Platform.OS === 'ios') {
    const notifeeSettings = await notifee.requestPermission();
    const notifeeGranted =
      notifeeSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      notifeeSettings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
    return enabled && notifeeGranted;
  }

  return enabled;
}

export async function getFcmDeviceToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    return token || null;
  } catch {
    return null;
  }
}

export async function registerFcmTokenWithBackend(
  saveToken: (args: {
    token: string;
    device: string;
  }) => Promise<{success?: boolean}>,
): Promise<boolean> {
  const token = await getFcmDeviceToken();
  if (!token) {
    return false;
  }

  try {
    const result = await saveToken({
      token,
      device: FCM_DEVICE_TYPE,
    });
    return result?.success !== false;
  } catch {
    return false;
  }
}

export function remoteMessageToStored(
  message: FirebaseMessagingTypes.RemoteMessage,
): StoredPushNotification {
  const {title, body} = getRemoteMessageContent(message);
  const receivedAt = new Date().toISOString();
  const id =
    message.messageId ??
    `${receivedAt}-${title}`.replace(/\s+/g, '-').slice(0, 64);
  const data: Record<string, string> = {};
  if (message.data) {
    for (const [key, value] of Object.entries(message.data)) {
      if (value != null) {
        data[key] = String(value);
      }
    }
  }
  return {id, title, body, receivedAt, data};
}

export async function displayForegroundNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const {title, body} = getRemoteMessageContent(message);
  if (!title && !body) {
    return;
  }

  if (Platform.OS === 'ios' && message.notification) {
    return;
  }

  await ensureAndroidNotificationChannel();

  await notifee.displayNotification({
    id: message.messageId ?? undefined,
    title,
    body,
    data: normalizeNotificationData(message.data),
    android:
      Platform.OS === 'android'
        ? {
            channelId: ANDROID_CHANNEL_ID,
            smallIcon: 'ic_notification',
            pressAction: {id: 'default'},
            importance: AndroidImportance.HIGH,
          }
        : undefined,
    ios:
      Platform.OS === 'ios'
        ? {
            foregroundPresentationOptions: {
              alert: true,
              badge: true,
              sound: false,
            },
          }
        : undefined,
  });
}

export async function handleIncomingRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
  options?: {showForegroundAlert?: boolean},
): Promise<StoredPushNotification> {
  const stored = await persistPushNotification(message);
  await ensureNotificationAudibleVolume();
  playOrderNotificationSoundIfNeeded(message);

  if (options?.showForegroundAlert) {
    await displayForegroundNotification(message);
  }

  return stored;
}

export function subscribeFcmTokenRefresh(
  onToken: (token: string) => void,
): () => void {
  return messaging().onTokenRefresh(onToken);
}

export function subscribeForegroundMessages(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onMessage(handler);
}

export function subscribeNotificationOpened(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onNotificationOpenedApp(handler);
}

export async function getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
  return messaging().getInitialNotification();
}
