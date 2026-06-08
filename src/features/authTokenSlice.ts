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
}

const initialState: AuthTokenState = {
  value: null,
  user: null,
  outletId: null,
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
    logout(state) {
      state.value = null;
      state.user = null;
      state.outletId = null;
    },
  },
});

export const {setAuth, setOutletId, logout} = authTokenSlice.actions;
export const authTokenReducer = authTokenSlice.reducer;

