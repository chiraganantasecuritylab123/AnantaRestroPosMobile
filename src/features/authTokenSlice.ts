import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {AuthUser} from '../services/authApi';

interface AuthTokenState {
  value: string | null;
  user: AuthUser | null;
}

const initialState: AuthTokenState = {
  value: null,
  user: null,
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
    },
    logout(state) {
      state.value = null;
      state.user = null;
    },
  },
});

export const {setAuth, logout} = authTokenSlice.actions;
export const authTokenReducer = authTokenSlice.reducer;

