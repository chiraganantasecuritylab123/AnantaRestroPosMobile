import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export interface AppBrandingConfig {
  primary_color?: string | null;
  secondary_color?: string | null;
  company_name?: string | null;
  app_logo?: string | null;
}

export interface AppVersionControlConfig {
  pos_web_version?: string;
  android_version?: string;
  ios_version?: string;
  force_update?: boolean;
  android_force_update?: boolean;
  ios_force_update?: boolean;
  min_supported_android_version?: string;
  min_supported_ios_version?: string;
}

export interface AppMaintenanceModeConfig {
  status?: boolean;
  message?: string;
}

export interface AppContactChannelConfig {
  value?: string;
  hint?: string;
  mailto_url?: string;
  gmail_url?: string;
  tel_url?: string;
}

export interface AppContactSupportConfig {
  email?: AppContactChannelConfig;
  phone?: AppContactChannelConfig;
}

export interface AppLegalConfig {
  terms_url?: string;
  privacy_policy_url?: string;
  privacy_policy_enabled?: boolean;
  terms_enabled?: boolean;
}

export interface AppPagesConfig {
  termsAndConditions?: {url?: string};
  privacyPolicy?: {url?: string};
}

export interface AppConfigData {
  branding?: AppBrandingConfig;
  version_control?: AppVersionControlConfig;
  maintenance_mode?: AppMaintenanceModeConfig;
  contact_support?: AppContactSupportConfig;
  legal?: AppLegalConfig;
  pages?: AppPagesConfig;
}

export interface AppConfigResponse {
  success: boolean;
  message?: string;
  data?: AppConfigData;
}

export function resolveTermsUrl(config?: AppConfigData | null): string | undefined {
  return (
    config?.pages?.termsAndConditions?.url?.trim() ||
    config?.legal?.terms_url?.trim() ||
    undefined
  );
}

export function resolvePrivacyUrl(config?: AppConfigData | null): string | undefined {
  return (
    config?.pages?.privacyPolicy?.url?.trim() ||
    config?.legal?.privacy_policy_url?.trim() ||
    undefined
  );
}

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: baseQueryWithReauthHandling,
  endpoints: builder => ({
    getConfig: builder.query<AppConfigResponse, void>({
      query: () => ({
        url: '/config',
        method: 'GET',
      }),
    }),
  }),
});

export const {useGetConfigQuery} = configApi;
