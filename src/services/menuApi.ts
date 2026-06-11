import {createApi} from '@reduxjs/toolkit/query/react';
import type {RootState} from '../store';
import {resolveOutletId} from '../utils/outletId';
import {BASE_URL, baseQueryWithReauthHandling} from './baseApi';
import {posApi} from './posApi';

export interface SettingsTax {
  id: string;
  title: string;
  rate: number;
  type: string;
}

export interface SettingsCategory {
  id: string;
  title: string;
  is_enabled?: boolean;
  isEnabled?: boolean;
}

export interface CreateCategoryRequest {
  title: string;
}

export interface CreateCategoryResponse {
  success: boolean;
  message: string;
  id: string;
}

export interface UpdateCategoryRequest {
  id: string;
  title: string;
}

export interface ChangeCategoryVisibilityRequest {
  id: string;
  isEnabled: boolean;
}

export interface ChangeCategoryVisibilityResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    isEnabled: boolean;
  };
}

export interface DeleteCategoryRequest {
  id: string;
}

export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

export interface CreateTaxRequest {
  title: string;
  rate: string | number;
  type: string;
}

export interface CreateTaxResponse {
  success: boolean;
  message: string;
  taxId: string;
}

export interface UpdateTaxRequest {
  id: string;
  title: string;
  rate: string | number;
  type: string;
}

export interface UpdateTaxResponse {
  success: boolean;
  message: string;
  taxId: string;
}

export interface DeleteTaxRequest {
  id: string;
}

export interface DeleteTaxResponse {
  success: boolean;
  message: string;
  taxId: string;
}

export interface ImageUploadResponse {
  success: boolean;
  url: string;
  type: string;
  filename: string;
}

export interface CreateMenuItemRequest {
  title: string;
  description: string;
  price: string;
  netPrice: string;
  categoryId: string;
  image: string;
  taxId: string;
}

export interface CreateMenuItemResponse {
  success: boolean;
  message: string;
  menuItemId: string;
}

export interface UpdateMenuItemBody {
  title: string;
  description: string;
  price: string;
  netPrice: string;
  categoryId: string;
  taxId: string;
  image?: string;
}

export interface UpdateMenuItemRequest extends UpdateMenuItemBody {
  id: string;
}

export interface UpdateMenuItemResponse {
  success: boolean;
  message: string;
}

export interface UpdateMenuItemStockSettingsRequest {
  id: string;
  automaticInventoryEnabled: boolean;
}

export interface UpdateMenuItemStockSettingsResponse {
  success: boolean;
  message: string;
}

export interface MenuItemPhotoResponse {
  success: boolean;
  message: string;
  imageURL?: string;
}

export function buildImageFormData(
  uri: string,
  fileName: string,
  mimeType: string,
): FormData {
  const formData = new FormData();
  formData.append('image', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  return formData;
}

export async function uploadImageFile(
  uri: string,
  fileName: string,
  mimeType: string,
  getState: () => RootState,
): Promise<ImageUploadResponse> {
  const formData = buildImageFormData(uri, fileName, mimeType);
  const state = getState();
  const token = state.authToken.value;
  const outletId = resolveOutletId(state);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (outletId) {
    headers['x-outlet-id'] = outletId;
  }

  const response = await fetch(`${BASE_URL}/image-upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = (await response.json()) as ImageUploadResponse & {
    message?: string;
  };

  if (!response.ok || !data?.success) {
    throw new Error(data?.message ?? 'Image upload failed');
  }

  return data;
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const origin = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function menuItemImageValue(uploadedPath: string | null | undefined): string {
  if (!uploadedPath?.trim()) {
    return '';
  }
  return resolveMediaUrl(uploadedPath.trim());
}

export function menuItemImageChanged(
  currentPath: string | null | undefined,
  initialPath: string | null | undefined,
): boolean {
  return (
    menuItemImageValue(currentPath).toLowerCase() !==
    menuItemImageValue(initialPath).toLowerCase()
  );
}

export const menuApi = createApi({
  reducerPath: 'menuApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['MenuTaxes', 'MenuCategories'],
  endpoints: builder => ({
    getTaxes: builder.query<SettingsTax[], void>({
      query: () => ({
        url: '/settings/taxes',
        method: 'GET',
      }),
      providesTags: ['MenuTaxes'],
    }),
    getCategories: builder.query<SettingsCategory[], void>({
      query: () => ({
        url: '/settings/categories',
        method: 'GET',
      }),
      providesTags: ['MenuCategories'],
    }),
    createCategory: builder.mutation<
      CreateCategoryResponse,
      CreateCategoryRequest
    >({
      query: body => ({
        url: '/settings/categories/add',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MenuCategories'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    updateCategory: builder.mutation<
      ApiSuccessResponse,
      UpdateCategoryRequest
    >({
      query: ({id, title}) => ({
        url: `/settings/categories/${id}/update`,
        method: 'POST',
        params: {lang: 'en'},
        body: {title},
      }),
      invalidatesTags: ['MenuCategories'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    changeCategoryVisibility: builder.mutation<
      ChangeCategoryVisibilityResponse,
      ChangeCategoryVisibilityRequest
    >({
      query: ({id, isEnabled}) => ({
        url: `/settings/categories/change-visibility/${id}`,
        method: 'PATCH',
        params: {lang: 'en'},
        body: {isEnabled},
      }),
      invalidatesTags: ['MenuCategories'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    deleteCategory: builder.mutation<ApiSuccessResponse, DeleteCategoryRequest>({
      query: ({id}) => ({
        url: `/settings/categories/${id}`,
        method: 'DELETE',
        params: {lang: 'en'},
      }),
      invalidatesTags: ['MenuCategories'],
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    createTax: builder.mutation<CreateTaxResponse, CreateTaxRequest>({
      query: body => ({
        url: '/settings/taxes/add',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MenuTaxes'],
    }),
    updateTax: builder.mutation<UpdateTaxResponse, UpdateTaxRequest>({
      query: ({id, title, rate, type}) => ({
        url: `/settings/taxes/${id}/update`,
        method: 'POST',
        params: {lang: 'en'},
        body: {title, rate: String(rate), type},
      }),
      invalidatesTags: ['MenuTaxes'],
    }),
    deleteTax: builder.mutation<DeleteTaxResponse, DeleteTaxRequest>({
      query: ({id}) => ({
        url: `/settings/taxes/${id}`,
        method: 'DELETE',
        params: {lang: 'en'},
      }),
      invalidatesTags: ['MenuTaxes'],
    }),
    createMenuItem: builder.mutation<
      CreateMenuItemResponse,
      CreateMenuItemRequest
    >({
      query: body => ({
        url: '/menu-items/add',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    updateMenuItem: builder.mutation<
      UpdateMenuItemResponse,
      UpdateMenuItemRequest
    >({
      query: ({id, ...body}) => ({
        url: `/menu-items/update/${id}`,
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    updateMenuItemStockSettings: builder.mutation<
      UpdateMenuItemStockSettingsResponse,
      UpdateMenuItemStockSettingsRequest
    >({
      query: ({id, automaticInventoryEnabled}) => ({
        url: `/menu-items/update/${id}/stock-settings`,
        method: 'PATCH',
        params: {lang: 'en'},
        body: {automaticInventoryEnabled},
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    uploadMenuItemPhoto: builder.mutation<
      MenuItemPhotoResponse,
      {id: string; image: string}
    >({
      query: ({id, image}) => ({
        url: `/menu-items/update/${id}/upload-photo`,
        method: 'POST',
        body: {image},
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    removeMenuItemPhoto: builder.mutation<MenuItemPhotoResponse, {id: string}>({
      query: ({id}) => ({
        url: `/menu-items/update/${id}/remove-photo`,
        method: 'POST',
      }),
      async onQueryStarted(_arg, {dispatch, queryFulfilled}) {
        try {
          await queryFulfilled;
          dispatch(posApi.util.invalidateTags(['PosInit']));
        } catch {
          // ignore
        }
      },
    }),
    uploadImage: builder.mutation<
      ImageUploadResponse,
      {uri: string; fileName: string; mimeType: string}
    >({
      async queryFn({uri, fileName, mimeType}, {getState}) {
        try {
          const data = await uploadImageFile(
            uri,
            fileName,
            mimeType,
            getState as () => RootState,
          );
          return {data};
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Image upload failed';
          return {error: {status: 'CUSTOM_ERROR', error: message}};
        }
      },
    }),
  }),
});

export const {
  useGetTaxesQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useChangeCategoryVisibilityMutation,
  useDeleteCategoryMutation,
  useCreateTaxMutation,
  useUpdateTaxMutation,
  useDeleteTaxMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useUpdateMenuItemStockSettingsMutation,
  useUploadMenuItemPhotoMutation,
  useRemoveMenuItemPhotoMutation,
  useUploadImageMutation,
} = menuApi;
