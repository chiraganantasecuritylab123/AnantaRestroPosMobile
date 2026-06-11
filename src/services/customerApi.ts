import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export interface CustomerSearchItem {
  phone: string;
  name: string;
  email: string;
  birth_date: string;
  gender: string;
  is_member: boolean;
  created_at: string;
}

export interface AddCustomerRequest {
  phone: string;
  phone_country_code: string;
  name: string;
  email: string;
  birthDate: string;
  gender: string;
}

export interface AddCustomerResponse {
  message: string;
}

export const customerApi = createApi({
  reducerPath: 'customerApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['Customers'],
  endpoints: builder => ({
    searchCustomers: builder.query<CustomerSearchItem[], string>({
      query: q => ({
        url: `/customers/search-by-phone-name/search`,
        method: 'GET',
        params: {q},
      }),
      providesTags: ['Customers'],
    }),
    addCustomer: builder.mutation<AddCustomerResponse, AddCustomerRequest>({
      query: body => ({
        url: '/customers/add',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Customers'],
    }),
  }),
});

export const {useSearchCustomersQuery, useAddCustomerMutation} = customerApi;

