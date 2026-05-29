import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';
import type {MenuItem} from './posApi';

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string | null;
}

export interface CreateOrderBase {
  cart: CartItem[];
  deliveryType: string;
  customerType: string;
  customerId: {phone: string; name: string} | null;
  tableId: string | number;
  selectedQrOrderItem: unknown | null;
}

export interface CreateOrderRequest extends CreateOrderBase {}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  tokenNo: number;
  orderId: number;
}

export interface CreateOrderAndInvoiceRequest extends CreateOrderBase {
  netTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  total: number;
  selectedPaymentType: string | number;
}

export interface CreateOrderAndInvoiceResponse {
  success: boolean;
  message: string;
  tokenNo: number;
  orderId: number;
  invoiceId: number;
}

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['Orders'],
  endpoints: builder => ({
    createOrder: builder.mutation<CreateOrderResponse, CreateOrderRequest>({
      query: body => ({
        url: '/pos/create-order',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders'],
    }),
    createOrderAndInvoice: builder.mutation<
      CreateOrderAndInvoiceResponse,
      CreateOrderAndInvoiceRequest
    >({
      query: body => ({
        url: '/pos/create-order-and-invoice',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useCreateOrderAndInvoiceMutation,
} = orderApi;

