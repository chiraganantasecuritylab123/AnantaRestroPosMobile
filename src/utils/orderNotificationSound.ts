import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { playOrderNotificationSound } from './playOrderSuccessSound';

const ORDER_TYPE_HINTS = [
  'order_created',
  'new_order',
  'order_received',
  'order_placed',
  'qr_order',
];

export function isOrderRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): boolean {
  const type = String(message.data?.type ?? '').toLowerCase();
  if (type && ORDER_TYPE_HINTS.some(hint => type.includes(hint))) {
    return true;
  }
  if (type.includes('order')) {
    return true;
  }

  if (message.data?.orderId || message.data?.order_id) {
    return true;
  }

  const title =
    message.notification?.title ?? message.data?.title ?? '';
  const body = message.notification?.body ?? message.data?.body ?? '';
  const text = `${title} ${body}`.toLowerCase();
  return /\b(new order|order received|order #|qr order)\b/.test(text);
}

export function playOrderNotificationSoundIfNeeded(
  message: FirebaseMessagingTypes.RemoteMessage,
): void {
  if (!isOrderRemoteMessage(message)) {
    return;
  }
  playOrderNotificationSound();
}
