import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {navigationRef} from './navigationRef';
import type {OrdersMainParams} from './types';

type NotificationNavTarget = {
  tab: 'Orders' | 'Dashboard';
  screen: 'OrdersMain' | 'Notifications';
  params?: OrdersMainParams;
};

const EVENT_ROUTES: Record<string, NotificationNavTarget> = {
  'qr.new_order': {tab: 'Orders', screen: 'OrdersMain'},
  'order.cancelled': {tab: 'Orders', screen: 'OrdersMain'},
};

let pendingPayload: Record<string, string> | null = null;

export function normalizeNotificationData(
  input?: Record<string, unknown> | null,
): Record<string, string> {
  if (!input) {
    return {};
  }

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value != null) {
      data[key] = String(value);
    }
  }
  return data;
}

export function remoteMessageToNotificationData(
  message: FirebaseMessagingTypes.RemoteMessage,
): Record<string, string> {
  return normalizeNotificationData(message.data);
}

export function resolveNotificationNavigation(
  data?: Record<string, string> | null,
): NotificationNavTarget | null {
  const event = data?.event?.trim();
  if (!event) {
    return null;
  }

  const target = EVENT_ROUTES[event];
  if (!target) {
    return null;
  }

  const orderId = data?.orderId ?? data?.order_id;
  if (target.screen === 'OrdersMain' && orderId) {
    return {
      ...target,
      params: {orderId: String(orderId)},
    };
  }

  return target;
}

function navigateToTarget(target: NotificationNavTarget): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }

  if (target.tab === 'Orders') {
    navigationRef.navigate('MainTabs', {
      screen: 'Orders',
      params: {
        screen: target.screen,
        params: target.params,
      },
    });
    return true;
  }

  navigationRef.navigate('MainTabs', {
    screen: 'Dashboard',
    params: {
      screen: target.screen,
    },
  });
  return true;
}

export function navigateFromNotificationPayload(
  data?: Record<string, string> | null,
): boolean {
  const normalized = data ?? {};
  const target = resolveNotificationNavigation(normalized);
  if (!target) {
    return false;
  }

  if (!navigationRef.isReady()) {
    pendingPayload = normalized;
    return false;
  }

  return navigateToTarget(target);
}

export function navigateFromRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): boolean {
  return navigateFromNotificationPayload(
    remoteMessageToNotificationData(message),
  );
}

export function flushPendingNotificationNavigation(): void {
  if (!pendingPayload || !navigationRef.isReady()) {
    return;
  }

  const data = pendingPayload;
  pendingPayload = null;
  navigateFromNotificationPayload(data);
}
