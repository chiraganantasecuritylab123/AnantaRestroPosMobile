import {fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {BaseQueryFn} from '@reduxjs/toolkit/query';
import {API_BASE_URL} from '@env';
import type {RootState} from '../store';
import {resolveOutletId} from '../utils/outletId';

// export const BASE_URL = API_BASE_URL;
export const BASE_URL = 'http://192.168.1.164:8001/api/v1';

export const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, {getState}) => {
    const state = getState() as RootState;
    const token = state?.authToken?.value;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const outletId = resolveOutletId(state);
    if (outletId) {
      headers.set('x-outlet-id', outletId);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const baseQueryWithReauthHandling: BaseQueryFn<
  {
    url: string;
    method?: string;
    body?: unknown;
    params?: Record<string, unknown>;
  },
  unknown,
  unknown
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if ((result as any)?.error?.status === 401) {
    api.dispatch({type: 'authToken/logout'});
  }
  return result;
};

