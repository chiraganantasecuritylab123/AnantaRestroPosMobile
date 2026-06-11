import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {AuthUser} from '../services/authApi';
import {
  extractOutletIdFromToken,
  extractOutletIdFromUser,
  pickOutletId,
} from '../utils/outletId';

interface AuthTokenState {
  value: string | null;
  user: AuthUser | null;
  /** POS outlet id for x-outlet-id header (not tenant_id). */
  outletId: string | null;
  /** Shown in blocking modal when an API reports inactive subscription. */
  subscriptionBlockMessage: string | null;
}

const initialState: AuthTokenState = {
  value: null,
  user: null,
  outletId: null,
  subscriptionBlockMessage: null,
};

const authTokenSlice = createSlice({
  name: 'authToken',
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{token: string; user: AuthUser | null}>,
    ) {
      state.value = action.payload.token;
      state.user = action.payload.user;
      state.subscriptionBlockMessage = null;
      const tenantId = action.payload.user?.tenant_id;
      const resolved = pickOutletId(
        tenantId,
        extractOutletIdFromUser(action.payload.user),
        extractOutletIdFromToken(action.payload.token),
        state.outletId,
      );
      if (resolved) {
        state.outletId = resolved;
      }
    },
    setOutletId(state, action: PayloadAction<string | null>) {
      state.outletId = action.payload;
    },
    markSubscriptionInactive(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.is_subscription_active = false;
      }
      state.subscriptionBlockMessage = action.payload;
    },
    updateSubscriptionActive(state, action: PayloadAction<boolean>) {
      if (state.user) {
        state.user.is_subscription_active = action.payload;
      }
      if (action.payload) {
        state.subscriptionBlockMessage = null;
      }
    },
    activateSubscription(
      state,
      action: PayloadAction<{
        subscription_id?: string | null;
        subscription_end?: string | null;
        is_free_plan_used?: boolean;
      }>,
    ) {
      if (state.user) {
        state.user.is_subscription_active = true;
        if (action.payload.subscription_id !== undefined) {
          state.user.subscription_id = action.payload.subscription_id;
        }
        if (action.payload.subscription_end !== undefined) {
          state.user.subscription_end = action.payload.subscription_end;
        }
        if (action.payload.is_free_plan_used !== undefined) {
          state.user.is_free_plan_used = action.payload.is_free_plan_used;
        }
      }
      state.subscriptionBlockMessage = null;
    },
    logout(state) {
      state.value = null;
      state.user = null;
      state.outletId = null;
      state.subscriptionBlockMessage = null;
    },
  },
});

export const {
  setAuth,
  setOutletId,
  markSubscriptionInactive,
  updateSubscriptionActive,
  activateSubscription,
  logout,
} = authTokenSlice.actions;
export const authTokenReducer = authTokenSlice.reducer;

