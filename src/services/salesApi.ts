import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export type SalesRangePreset = 'today' | 'week' | 'month' | 'custom';
export type SalesPeriod = 'day' | 'week' | 'month';
export type SalesSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
export type SalesStatus = 'all' | 'completed' | 'pending' | 'cancelled';

export interface SalesOrderItem {
  orderId: string;
  tokenNo: number;
  formattedToken: string;
  customerName: string | null;
  deliveryType: string;
  tableId: string | null;
  tableTitle: string | null;
  paymentStatus: string;
  servedAt: string;
  itemsCount: number;
  outletName: string;
  orderDate: string;
  orderTime: string;
  paymentMethod: string;
  orderStatus: string;
  subTotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
}

export interface SalesSummary {
  totalOrders: number;
  todaySales: number;
  todayOrdersCount: number;
  weekSales: number;
  weeklyGrowthPercent: number;
  monthSales: number;
  monthlyGrowthPercent: number;
  grossSales: number;
  netSales: number;
  taxCollection: number;
  totalDiscounts: number;
  taxAmount: number;
  discountAmount: number;
}

export interface SalesChart {
  period: string;
  labels: string[];
  salesAmount: number[];
  orderCount: number[];
  netSales: number[];
}

export interface SalesPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface SalesOrdersData {
  summary: SalesSummary;
  salesChart: SalesChart;
  paymentAnalytics: Array<{
    paymentMethod: string;
    orderCount: number;
    salesAmount: number;
  }>;
  outletAnalytics: Array<{
    outletId: string;
    outletName: string;
    orderCount: number;
    salesAmount: number;
    revenue: number;
  }>;
  statusAnalytics: Array<{
    status: string;
    orderCount: number;
    salesAmount: number;
  }>;
  orders: SalesOrderItem[];
  pagination: SalesPagination;
}

export interface GetSalesOrdersResponse {
  success: boolean;
  message: string;
  data: SalesOrdersData;
}

export interface GetSalesOrdersArgs {
  rangePreset?: SalesRangePreset;
  start_date?: string;
  end_date?: string;
  period?: SalesPeriod;
  status?: SalesStatus;
  sort?: SalesSort;
  outlet_id?: string;
  payment_type?: string;
  page?: number;
  limit?: number;
  lang?: string;
}

export function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function resolveSalesDateRange(
  preset: SalesRangePreset,
  customStart?: string,
  customEnd?: string,
): {start: string; end: string; rangePreset: SalesRangePreset} {
  const today = new Date();
  const end = formatDateParam(today);

  if (preset === 'today') {
    return {start: end, end, rangePreset: 'today'};
  }
  if (preset === 'week') {
    const d = new Date(today);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    d.setDate(d.getDate() - mondayOffset);
    return {start: formatDateParam(d), end, rangePreset: 'week'};
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return {start: formatDateParam(d), end, rangePreset: 'month'};
  }

  return {
    start: customStart ?? end,
    end: customEnd ?? end,
    rangePreset: 'custom',
  };
}

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['SalesOrders'],
  endpoints: builder => ({
    getSalesOrders: builder.query<SalesOrdersData, GetSalesOrdersArgs | void>({
      query: (args = {}) => {
        const todayStr = formatDateParam(new Date());
        const params: Record<string, string | number> = {
          rangePreset: args.rangePreset ?? 'today',
          start_date: args.start_date ?? todayStr,
          end_date: args.end_date ?? todayStr,
          period: args.period ?? 'day',
          status: args.status ?? 'all',
          sort: args.sort ?? 'date_desc',
          page: args.page ?? 1,
          limit: args.limit ?? 20,
          lang: args.lang ?? 'en',
        };
        if (args.outlet_id) {
          params.outlet_id = args.outlet_id;
        }
        if (args.payment_type) {
          params.payment_type = args.payment_type;
        }
        return {url: '/sales/orders', params};
      },
      transformResponse: (response: GetSalesOrdersResponse) => response.data,
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
          orders: [...currentCache.orders, ...newPage.orders],
        };
      },
      forceRefetch: ({currentArg, previousArg}) =>
        (currentArg?.page ?? 1) === 1 ||
        (currentArg?.page ?? 1) !== (previousArg?.page ?? 1),
      providesTags: ['SalesOrders'],
    }),
  }),
});

export const {useGetSalesOrdersQuery} = salesApi;
