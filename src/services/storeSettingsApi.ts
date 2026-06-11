import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';
import {posApi} from './posApi';

export interface StoreSettings {
  storeImage: string | null;
  storeName: string;
  address: string;
  phone: string;
  email: string;
  tenantEmail: string;
  tenantPhone: string;
  countryCode?: string | null;
  currency: string;
  image: string | null;
  isQRMenuEnabled: boolean;
  isQROrderEnabled: boolean;
  uniqueQRCode: string | null;
  isFeedbackEnabled: boolean;
  uniqueId: string | null;
  id: string;
}

export interface UpdateStoreSettingsRequest {
  storeName: string;
  address: string;
  currency: string;
  isQRMenuEnabled: boolean;
  isQROrderEnabled: boolean;
  isFeedbackEnabled: boolean;
}

export interface UpdateStoreSettingsResponse {
  success: boolean;
  message: string;
}

export interface UploadStoreImageResponse {
  success: boolean;
  message: string;
  imageURL?: string;
}

export const storeSettingsApi = createApi({
  reducerPath: 'storeSettingsApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['StoreSettings'],
  endpoints: builder => ({
    getStoreSettings: builder.query<StoreSettings, void>({
      query: () => ({
        url: '/settings/store-setting',
        method: 'GET',
        params: {lang: 'en'},
      }),
      providesTags: ['StoreSettings'],
    }),
    updateStoreSettings: builder.mutation<
      UpdateStoreSettingsResponse,
      UpdateStoreSettingsRequest
    >({
      query: body => ({
        url: '/settings/store-setting',
        method: 'POST',
        params: {lang: 'en'},
        body,
      }),
      invalidatesTags: ['StoreSettings'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    uploadStoreImage: builder.mutation<UploadStoreImageResponse, {image: string}>(
      {
        query: body => ({
          url: '/settings/store-setting/upload-store-image',
          method: 'POST',
          params: {lang: 'en'},
          body,
        }),
        invalidatesTags: ['StoreSettings'],
        async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
          try {
            await queryFulfilled;
            dispatch(posApi.util.invalidateTags(['PosInit']));
          } catch {
            // ignore
          }
        },
      },
    ),
  }),
});

export const {
  useGetStoreSettingsQuery,
  useUpdateStoreSettingsMutation,
  useUploadStoreImageMutation,
} = storeSettingsApi;
