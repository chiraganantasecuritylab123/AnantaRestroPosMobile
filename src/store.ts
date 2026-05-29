import {configureStore} from '@reduxjs/toolkit';
import {setupListeners} from '@reduxjs/toolkit/query';
import {authApi} from './services/authApi';
import {posApi} from './services/posApi';
import {customerApi} from './services/customerApi';
import {orderApi} from './services/orderApi';
import {authTokenReducer} from './features/authTokenSlice';
import {cartReducer} from './features/cartSlice';
import {orderHistoryReducer} from './features/orderHistorySlice';
import {
  clearAuthFromStorage,
  saveAuthToStorage,
  type StoredAuthPayload,
} from './storage/authStorage';

const authPersistenceMiddleware =
  (storeApi: {dispatch: any}) => (next: any) => (action: any) => {
    if (action?.type === 'authToken/setAuth') {
      const payload = action.payload as {token: string; user: any};
      const stored: StoredAuthPayload = {
        token: payload.token,
        user: payload.user,
      };
      saveAuthToStorage(stored);
    }

    if (action?.type === 'authToken/logout') {
      clearAuthFromStorage();
    }

    return next(action);
  };

export const store = configureStore({
  reducer: {
    authToken: authTokenReducer,
    cart: cartReducer,
    orderHistory: orderHistoryReducer,
    [authApi.reducerPath]: authApi.reducer,
    [posApi.reducerPath]: posApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(
      authPersistenceMiddleware as any,
      authApi.middleware,
      posApi.middleware,
      customerApi.middleware,
      orderApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

setupListeners(store.dispatch);

