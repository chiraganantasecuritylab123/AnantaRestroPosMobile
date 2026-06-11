import type {Middleware} from '@reduxjs/toolkit';
import {clearCart} from '../features/cartSlice';
import {logout} from '../features/authTokenSlice';
import {resetOrderHistory} from '../features/orderHistorySlice';
import {authApi} from '../services/authApi';
import {posApi} from '../services/posApi';
import {customerApi} from '../services/customerApi';
import {orderApi} from '../services/orderApi';
import {menuApi} from '../services/menuApi';
import {inventoryApi} from '../services/inventoryApi';
import {configApi} from '../services/configApi';
import {fcmApi} from '../services/fcmApi';
import {notificationsApi} from '../services/notificationsApi';
import {salesApi} from '../services/salesApi';
import {storeSettingsApi} from '../services/storeSettingsApi';
import {subscriptionApi} from '../services/subscriptionApi';

const RTK_APIS = [
  authApi,
  posApi,
  customerApi,
  orderApi,
  menuApi,
  inventoryApi,
  configApi,
  fcmApi,
  notificationsApi,
  salesApi,
  storeSettingsApi,
  subscriptionApi,
] as const;

function isLogoutAction(action: unknown): boolean {
  if (!action || typeof action !== 'object') {
    return false;
  }
  const type = (action as {type?: string}).type;
  return type === logout.type || type === 'authToken/logout';
}

/** Clears cart, order history, and all RTK Query caches after logout. */
export const sessionLogoutMiddleware: Middleware = storeApi => next => action => {
  const result = next(action);

  if (!isLogoutAction(action)) {
    return result;
  }

  storeApi.dispatch(clearCart());
  storeApi.dispatch(resetOrderHistory());

  for (const api of RTK_APIS) {
    storeApi.dispatch(api.util.resetApiState());
  }

  return result;
};
