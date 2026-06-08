import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export const FCM_DEVICE_TYPE = 'pos-mobile';

export interface SaveFcmTokenRequest {
  token: string;
  device: string;
}

export interface SaveFcmTokenResponse {
  success: boolean;
  firebase?: boolean;
  message?: string;
}

export const fcmApi = createApi({
  reducerPath: 'fcmApi',
  baseQuery: baseQueryWithReauthHandling,
  endpoints: builder => ({
    saveFcmToken: builder.mutation<SaveFcmTokenResponse, SaveFcmTokenRequest>({
      query: body => ({
        url: '/fcm/save-token',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {useSaveFcmTokenMutation} = fcmApi;
