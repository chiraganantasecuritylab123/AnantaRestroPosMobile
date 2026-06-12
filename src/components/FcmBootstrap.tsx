import React, {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import type {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import {useAppDispatch} from '../useAppHooks';
import {FCM_DEVICE_TYPE, useSaveFcmTokenMutation} from '../services/fcmApi';
import {
  configureForegroundPresentation,
  ensureAndroidNotificationChannel,
  getInitialNotification,
  handleIncomingRemoteMessage,
  registerFcmTokenWithBackend,
  requestNotificationPermission,
  subscribeFcmTokenRefresh,
  subscribeForegroundMessages,
  subscribeNotificationOpened,
} from '../services/fcmService';
import {
  flushPendingNotificationNavigation,
  navigateFromNotificationPayload,
  navigateFromRemoteMessage,
} from '../navigation/notificationNavigation';
import {refreshNotificationsCache} from '../services/notificationsSync';
import {loadPushNotifications} from '../storage/notificationsStorage';
import {
  prependPushNotification,
  setPushNotificationsHydrated,
} from '../features/pushNotificationsSlice';

/**
 * Registers FCM token with backend after login and handles push lifecycle.
 */
export const FcmBootstrap: React.FC = () => {
  const authToken = useSelector((state: RootState) => state.authToken.value);
  const dispatch = useAppDispatch();
  const [saveFcmToken] = useSaveFcmTokenMutation();

  useEffect(() => {
    void loadPushNotifications().then(items => {
      dispatch(setPushNotificationsHydrated(items));
    });
  }, [dispatch]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    flushPendingNotificationNavigation();
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let unsubForeground: (() => void) | undefined;
    let unsubOpened: (() => void) | undefined;
    let unsubTokenRefresh: (() => void) | undefined;
    let unsubNotifeeForeground: (() => void) | undefined;
    let cancelled = false;

    const syncInbox = () => refreshNotificationsCache(dispatch);

    const handleNotificationOpen = async (
      message: FirebaseMessagingTypes.RemoteMessage,
    ) => {
      const stored = await handleIncomingRemoteMessage(message);
      dispatch(prependPushNotification(stored));
      syncInbox();
      navigateFromRemoteMessage(message);
    };

    unsubForeground = subscribeForegroundMessages(async message => {
      const stored = await handleIncomingRemoteMessage(message, {
        showForegroundAlert: true,
      });
      dispatch(prependPushNotification(stored));
      syncInbox();
    });

    unsubOpened = subscribeNotificationOpened(message => {
      void handleNotificationOpen(message);
    });

    unsubNotifeeForeground = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        navigateFromNotificationPayload(detail.notification?.data ?? undefined);
      }
    });

    (async () => {
      await ensureAndroidNotificationChannel();
      await configureForegroundPresentation();

      const permitted = await requestNotificationPermission();
      if (cancelled) {
        return;
      }

      if (permitted) {
        await registerFcmTokenWithBackend(
          async body => saveFcmToken(body).unwrap(),
        );

        unsubTokenRefresh = subscribeFcmTokenRefresh(async token => {
          await saveFcmToken({token, device: FCM_DEVICE_TYPE}).unwrap();
        });
      }

      const initial = await getInitialNotification();
      if (initial && !cancelled) {
        await handleNotificationOpen(initial);
      }
    })();

    return () => {
      cancelled = true;
      unsubForeground?.();
      unsubOpened?.();
      unsubTokenRefresh?.();
      unsubNotifeeForeground?.();
    };
  }, [authToken, dispatch, saveFcmToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        refreshNotificationsCache(dispatch);
        flushPendingNotificationNavigation();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [authToken, dispatch]);

  return null;
};
