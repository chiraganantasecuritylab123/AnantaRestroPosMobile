import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';
import {
  parseOrdersPage,
  type GetOrdersQueryArgs,
  type GetOrdersResponse,
  type OrderListItem,
  type PaginatedOrdersResult,
} from '../utils/ordersList';

/** Cart line shape required by POST /pos/create-order-and-invoice */
export interface ApiCartLineItem {
  item_id: string;
  quantity: number;
  price: number;
  base_price?: number;
  final_price?: number;
  discount_amount?: number;
  offer_applied?: boolean;
  offerLineId?: string | null;
  is_reward?: boolean;
  linked_offer_id?: string | null;
  variant_id?: string | null;
  addons_ids?: string[];
  notes?: string | null;
  recipeItems?: unknown[];
}

export interface CreateOrderBase {
  cart: ApiCartLineItem[];
  deliveryType: 'dinein' | 'takeaway' | string;
  customerType: 'WALKIN' | 'CUSTOMER' | string;
  customerId: {phone: string; name: string} | null;
  tableId: string | number | null;
  selectedQrOrderItem: string | number | null;
}

export interface CreateOrderRequest extends CreateOrderBase {}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  tokenNo: string | number;
  formattedToken?: string;
  tokenNoNumeric?: number;
  orderId: string | number;
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
  tokenNo: string | number;
  formattedToken?: string;
  tokenNoNumeric?: number;
  orderId: string | number;
  invoiceId: string | number;
}

export interface RemoveOrderItemRequest {
  itemId: string;
  removeQuantity: number;
}

export interface RemoveOrderItemResponse {
  success: boolean;
  message: string;
  orderId: string;
  tableId: string | null;
  removedQuantity: number;
  remainingQuantity: number;
  removedAll: boolean;
  actorId: string;
}

export interface CancelOrdersRequest {
  orderIds: string[];
}

export interface CancelOrdersResponse {
  success: boolean;
  message: string;
}

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['Orders'],
  endpoints: builder => ({
    getOrders: builder.query<PaginatedOrdersResult, GetOrdersQueryArgs | void>({
      query: (args = {}) => {
        const page = args.page ?? 1;
        const limit = args.limit ?? 20;
        const params: Record<string, string | number> = {
          lang: 'en',
          page,
          limit,
        };
        if (args.status) {
          params.status = args.status;
        }
        if (args.deliveryType) {
          params.deliveryType = args.deliveryType;
        }
        return {url: '/orders', params};
      },
      transformResponse: (response: GetOrdersResponse, _meta, arg) =>
        parseOrdersPage(response, {
          page: arg?.page ?? 1,
          limit: arg?.limit ?? 20,
        }),
      serializeQueryArgs: ({endpointName, queryArgs}) => {
        const args = queryArgs ?? {};
        const {page: _page, ...filters} = args;
        return `${endpointName}(${JSON.stringify(filters)})`;
      },
      merge: (currentCache, newPage, {arg}) => {
        if ((arg?.page ?? 1) === 1) {
          return newPage;
        }
        return {
          ...newPage,
          items: [...currentCache.items, ...newPage.items],
        };
      },
      forceRefetch: ({currentArg, previousArg}) =>
        (currentArg?.page ?? 1) === 1 ||
        (currentArg?.page ?? 1) !== (previousArg?.page ?? 1),
      providesTags: ['Orders'],
    }),
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
    removeOrderItem: builder.mutation<
      RemoveOrderItemResponse,
      RemoveOrderItemRequest
    >({
      query: ({itemId, removeQuantity}) => ({
        url: `/pos/table-orders/items/${itemId}/remove`,
        method: 'POST',
        body: {removeQuantity},
      }),
      invalidatesTags: ['Orders'],
    }),
    cancelOrders: builder.mutation<CancelOrdersResponse, CancelOrdersRequest>({
      query: body => ({
        url: '/orders/cancel',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders'],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useCreateOrderMutation,
  useCreateOrderAndInvoiceMutation,
  useRemoveOrderItemMutation,
  useCancelOrdersMutation,
} = orderApi;

export type {
  GetOrdersQueryArgs,
  OrderListItem,
  PaginatedOrdersResult,
} from '../utils/ordersList';
