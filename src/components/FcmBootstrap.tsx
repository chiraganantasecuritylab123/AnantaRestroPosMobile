import React, {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import {useAppDispatch} from '../useAppHooks';
import {FCM_DEVICE_TYPE, useSaveFcmTokenMutation} from '../services/fcmApi';
import {
  ensureAndroidNotificationChannel,
  getInitialNotification,
  handleIncomingRemoteMessage,
  registerFcmTokenWithBackend,
  requestNotificationPermission,
  subscribeFcmTokenRefresh,
  subscribeForegroundMessages,
  subscribeNotificationOpened,
} from '../services/fcmService';
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

    let unsubForeground: (() => void) | undefined;
    let unsubOpened: (() => void) | undefined;
    let unsubTokenRefresh: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await ensureAndroidNotificationChannel();
      const permitted = await requestNotificationPermission();
      if (!permitted || cancelled) {
        return;
      }

      await registerFcmTokenWithBackend(
        async body => saveFcmToken(body).unwrap(),
      );

      const syncInbox = () => refreshNotificationsCache(dispatch);

      const initial = await getInitialNotification();
      if (initial && !cancelled) {
        const stored = await handleIncomingRemoteMessage(initial);
        dispatch(prependPushNotification(stored));
        syncInbox();
      }

      unsubForeground = subscribeForegroundMessages(async message => {
        const stored = await handleIncomingRemoteMessage(message, {
          showForegroundAlert: true,
        });
        dispatch(prependPushNotification(stored));
        syncInbox();
      });

      unsubOpened = subscribeNotificationOpened(async message => {
        const stored = await handleIncomingRemoteMessage(message);
        dispatch(prependPushNotification(stored));
        syncInbox();
      });

      unsubTokenRefresh = subscribeFcmTokenRefresh(async token => {
        await saveFcmToken({token, device: FCM_DEVICE_TYPE}).unwrap();
      });
    })();

    return () => {
      cancelled = true;
      unsubForeground?.();
      unsubOpened?.();
      unsubTokenRefresh?.();
    };
  }, [authToken, dispatch, saveFcmToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        refreshNotificationsCache(dispatch);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [authToken, dispatch]);

  return null;
};
