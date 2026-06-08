import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {StoredPushNotification} from '../storage/notificationsStorage';

type PushNotificationsState = {
  items: StoredPushNotification[];
  hydrated: boolean;
};

const initialState: PushNotificationsState = {
  items: [],
  hydrated: false,
};

export const pushNotificationsSlice = createSlice({
  name: 'pushNotifications',
  initialState,
  reducers: {
    setPushNotificationsHydrated(
      state,
      action: PayloadAction<StoredPushNotification[]>,
    ) {
      state.items = action.payload;
      state.hydrated = true;
    },
    prependPushNotification(state, action: PayloadAction<StoredPushNotification>) {
      const exists = state.items.some(n => n.id === action.payload.id);
      if (exists) {
        return;
      }
      state.items = [action.payload, ...state.items].slice(0, 100);
    },
    clearPushNotificationsState(state) {
      state.items = [];
    },
  },
});

export const {
  setPushNotificationsHydrated,
  prependPushNotification,
  clearPushNotificationsState,
} = pushNotificationsSlice.actions;

export const pushNotificationsReducer = pushNotificationsSlice.reducer;
