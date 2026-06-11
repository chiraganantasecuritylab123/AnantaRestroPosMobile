import {PermissionsAndroid, Platform} from 'react-native';
import {showDialog} from '../context/DialogProvider';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {FCM_DEVICE_TYPE} from './fcmApi';
import {
  persistPushNotification,
  type StoredPushNotification,
} from '../storage/notificationsStorage';

const ANDROID_CHANNEL_ID = 'pos_default';

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  // RN Firebase reads default channel from manifest; this is a no-op placeholder
  // for future Notifee integration if needed.
  void ANDROID_CHANNEL_ID;
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
  const title =
    message.notification?.title ?? message.data?.title ?? 'Notification';
  const body = message.notification?.body ?? message.data?.body ?? '';
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

export async function handleIncomingRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
  options?: {showForegroundAlert?: boolean},
): Promise<StoredPushNotification> {
  const stored = await persistPushNotification(message);

  if (options?.showForegroundAlert && message.notification) {
    showDialog(
      message.notification.title ?? 'Notification',
      message.notification.body ?? '',
    );
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
