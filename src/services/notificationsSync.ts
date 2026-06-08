import {notificationsApi} from './notificationsApi';
import type {AppDispatch} from '../store';

/** Refetch all active GET /notifications queries (dashboard badge + list). */
export function refreshNotificationsCache(dispatch: AppDispatch): void {
  dispatch(notificationsApi.util.invalidateTags(['Notifications']));
}
