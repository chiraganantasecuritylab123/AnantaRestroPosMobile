import {fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {BaseQueryFn} from '@reduxjs/toolkit/query';
import type {RootState} from '../store';

// const BASE_URL = 'http://localhost:8000/api/v1';
// const BASE_URL = 'http://192.168.1.164:5173/api/v1';
const BASE_URL = 'http://192.168.1.164:8001/api/v1';
// const BASE_URL = 'http://192.168.1.164:8001/api/v1';
// const BASE_URL = 'https://api.pos.anantalabs.in/api/v1';

export const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, {getState}) => {
    const token = (getState() as RootState)?.authToken?.value;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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

