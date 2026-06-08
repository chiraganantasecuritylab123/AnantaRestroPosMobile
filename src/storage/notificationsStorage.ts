import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';

const STORAGE_KEY = '@ananta_pos/push_notifications';
const MAX_STORED = 100;

export type StoredPushNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  data?: Record<string, string>;
};

function messageToStored(
  message: FirebaseMessagingTypes.RemoteMessage,
): StoredPushNotification {
  const title =
    message.notification?.title ??
    message.data?.title ??
    'Notification';
  const body =
    message.notification?.body ?? message.data?.body ?? '';
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

async function readAll(): Promise<StoredPushNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredPushNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadPushNotifications(): Promise<StoredPushNotification[]> {
  return readAll();
}

export async function persistPushNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<StoredPushNotification> {
  const entry = messageToStored(message);
  const existing = await readAll();
  const withoutDup = existing.filter(n => n.id !== entry.id);
  const next = [entry, ...withoutDup].slice(0, MAX_STORED);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export async function clearPushNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
