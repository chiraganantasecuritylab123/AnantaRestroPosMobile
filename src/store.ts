import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';
import {authApi} from './services/authApi';
import {posApi} from './services/posApi';
import {customerApi} from './services/customerApi';
import {orderApi} from './services/orderApi';
import {menuApi} from './services/menuApi';
import {inventoryApi} from './services/inventoryApi';
import {configApi} from './services/configApi';
import {fcmApi} from './services/fcmApi';
import {notificationsApi} from './services/notificationsApi';
import {
  clearPushNotificationsState,
  pushNotificationsReducer,
} from './features/pushNotificationsSlice';
import {clearPushNotifications} from './storage/notificationsStorage';
import {authTokenReducer} from './features/authTokenSlice';
import {cartReducer} from './features/cartSlice';
import {orderHistoryReducer} from './features/orderHistorySlice';
import {
  clearAuthFromStorage,
  saveAuthToStorage,
  type StoredAuthPayload,
} from './storage/authStorage';
import {cartPersistenceMiddleware} from './store/cartPersistenceMiddleware';

type AuthPersistGetState = () => {
  authToken: {
    value: string | null;
    user: unknown;
    outletId: string | null;
  };
};

const authPersistenceMiddleware =
  (storeApi: {getState: AuthPersistGetState}) =>
  (next: (action: unknown) => unknown) =>
  (action: {type?: string; payload?: unknown}) => {
    if (action?.type === 'authToken/setAuth') {
      const payload = action.payload as {token: string; user: unknown};
      const outletId = storeApi.getState().authToken.outletId ?? null;
      const stored: StoredAuthPayload = {
        token: payload.token,
        user: payload.user,
        outletId,
      };
      saveAuthToStorage(stored);
    }

    if (action?.type === 'authToken/setOutletId') {
      const outletId = action.payload as string | null;
      const state = storeApi.getState().authToken;
      if (state?.value) {
        saveAuthToStorage({
          token: state.value,
          user: state.user,
          outletId,
        });
      }
    }

    if (action?.type === 'authToken/logout') {
      clearAuthFromStorage();
      void clearPushNotifications();
      storeApi.dispatch(clearPushNotificationsState());
    }

    return next(action);
  };

export const store = configureStore({
  reducer: {
    authToken: authTokenReducer,
    cart: cartReducer,
    orderHistory: orderHistoryReducer,
    pushNotifications: pushNotificationsReducer,
    [authApi.reducerPath]: authApi.reducer,
    [posApi.reducerPath]: posApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [menuApi.reducerPath]: menuApi.reducer,
    [inventoryApi.reducerPath]: inventoryApi.reducer,
    [configApi.reducerPath]: configApi.reducer,
    [fcmApi.reducerPath]: fcmApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(
      authPersistenceMiddleware as any,
      cartPersistenceMiddleware,
      authApi.middleware,
      posApi.middleware,
      customerApi.middleware,
      orderApi.middleware,
      menuApi.middleware,
      inventoryApi.middleware,
      configApi.middleware,
      fcmApi.middleware,
      notificationsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

setupListeners(store.dispatch);

