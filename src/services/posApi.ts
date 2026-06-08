import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';
import {setOutletId} from '../features/authTokenSlice';
import {extractOutletIdFromPosInit} from '../utils/outletId';
import {
  normalizePrintSettings,
  type PrintSettingsConfig,
} from '../utils/printConfig';

export interface Category {
  id: number;
  title: string;
  is_enabled: boolean;
}

export interface PaymentType {
  id: number;
  title: string;
  is_active: boolean;
  icon: string;
}

export interface StoreTable {
  id: number;
  table_title: string;
  floor: string;
  seating_capacity: number;
  encrypted_id: string;
}

export interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: string;
  net_price: string;
  tax_id: number;
  tax_title: string;
  tax_rate: number;
  tax_type: string;
  category_id: number;
  category_title: string;
  image: string | null;
  is_enabled: boolean;
  addons: unknown[];
  variants: unknown[];
  recipeItems: unknown[];
  automatic_inventory_enabled?: boolean;
  automaticInventoryEnabled?: boolean;
}

export interface PosOutletSummary {
  id?: number | string;
  outlet_id?: number | string;
  title?: string;
  name?: string;
  is_default?: boolean;
  isDefault?: boolean;
}

export interface PosInitResponse {
  outlet_id?: number | string;
  outletId?: number | string;
  current_outlet_id?: number | string;
  outlet?: {id?: number | string; title?: string};
  currentOutlet?: {id?: number | string};
  outlets?: PosOutletSummary[];
  categories: Category[];
  paymentTypes: PaymentType[];
  printSettings: PrintSettingsConfig | null;
  storeSettings: {
    tenant_id: number;
    outlet_id?: number | string;
    outletId?: number | string;
    store_image: string | null;
    store_name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string | null;
    is_qr_menu_enabled: boolean;
    unique_qr_code: string | null;
    is_qr_order_enabled: boolean | null;
    is_feedback_enabled: boolean;
    unique_id: string | null;
  };
  storeTables: StoreTable[];
  menuItems: MenuItem[];
  serviceCharge: string;
}

export const posApi = createApi({
  reducerPath: 'posApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['PosInit'],
  endpoints: builder => ({
    getPosInit: builder.query<PosInitResponse, void>({
      query: () => ({
        url: '/pos/init',
        method: 'GET',
      }),
      transformResponse: (response: PosInitResponse & Record<string, unknown>) => ({
        ...response,
        printSettings: normalizePrintSettings(
          response.printSettings ??
            response.print_settings ??
            response.printer_settings,
        ),
      }),
      providesTags: ['PosInit'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          const {data} = await queryFulfilled;
          const outletId = extractOutletIdFromPosInit(data);
          if (outletId) {
            dispatch(setOutletId(outletId));
          }
        } catch {
          // ignore
        }
      },
    }),
  }),
});

export const {useGetPosInitQuery} = posApi;

