import {createApi} from '@reduxjs/toolkit/query/react';
import {baseQueryWithReauthHandling} from './baseApi';

export type InventoryStatus = 'in' | 'low' | 'out' | 'all';

export interface LinkedMenuItem {
  menu_item_id: string;
  menu_item_title: string;
  stock_management_mode: string;
}

export interface InventoryItem {
  id: string;
  title: string;
  quantity: string | number;
  unit: string;
  min_quantity_threshold: string | number;
  status: 'in' | 'low' | 'out';
  created_at?: string;
  updated_at?: string;
  tenant_id?: string;
  outlet_id?: string;
  linked_menu_items?: LinkedMenuItem[];
}

export interface InventoryListResponse {
  items: InventoryItem[];
  statusCounts: {
    in: number;
    low: number;
    out: number;
  };
}

export interface LinkableMenuItem {
  id: string;
  title: string;
  linked_inventory_item_id?: string | null;
}

export interface LinkableMenuItemsResponse {
  items: LinkableMenuItem[];
}

function normalizeLinkableMenuItem(entry: unknown): LinkableMenuItem | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const row = entry as Record<string, unknown>;
  const id = row.id ?? row.menu_item_id ?? row.menuItemId;
  const title = row.title ?? row.menu_item_title ?? row.menuItemTitle;
  if (id == null || title == null) {
    return null;
  }

  const linked =
    row.linked_inventory_item_id ?? row.linkedInventoryItemId ?? null;

  return {
    id: String(id),
    title: String(title),
    linked_inventory_item_id:
      linked == null || linked === '' ? null : String(linked),
  };
}

export function parseLinkableMenuItemsResponse(
  response: unknown,
): LinkableMenuItemsResponse {
  if (!response || typeof response !== 'object') {
    return {items: []};
  }

  const root = response as Record<string, unknown>;
  let rawItems: unknown[] = [];

  if (Array.isArray(root.items)) {
    rawItems = root.items;
  } else if (root.data && typeof root.data === 'object') {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.items)) {
      rawItems = data.items;
    }
  } else if (Array.isArray(response)) {
    rawItems = response;
  }

  const items = rawItems
    .map(normalizeLinkableMenuItem)
    .filter((item): item is LinkableMenuItem => Boolean(item?.id && item?.title));

  return {items};
}

export function filterUnlinkedMenuItems(
  items: LinkableMenuItem[],
): LinkableMenuItem[] {
  return items.filter(item => !item.linked_inventory_item_id);
}

export function filterMenuItemsForInventoryEdit(
  items: LinkableMenuItem[],
  inventoryItemId: string,
): LinkableMenuItem[] {
  const forEdit = items.filter(
    item =>
      !item.linked_inventory_item_id ||
      item.linked_inventory_item_id === inventoryItemId,
  );
  if (forEdit.length > 0) {
    return forEdit;
  }
  const unlinked = filterUnlinkedMenuItems(items);
  return unlinked.length > 0 ? unlinked : items;
}

export function resolveAllLinkableMenuItems(
  linkableItems: LinkableMenuItem[] | undefined,
  posInitMenuItems: Array<{id: number | string; title?: string | null}> | undefined,
): LinkableMenuItem[] {
  if (linkableItems?.length) {
    return linkableItems;
  }

  return (posInitMenuItems ?? [])
    .map(item => ({
      id: String(item.id),
      title: item.title?.trim() ?? '',
      linked_inventory_item_id: null,
    }))
    .filter(item => item.title);
}

export interface AddInventoryItemRequest {
  title: string;
  quantity: number;
  unit: string;
  min_quantity_threshold: number;
  linkedMenuItemIds?: string[];
}

export interface AddInventoryItemResponse {
  success: boolean;
  message: string;
  itemId: string;
  linked_menu_item?: {
    menu_item_id: string;
    menu_item_title: string;
    automatic_inventory_enabled: boolean;
  };
}

export interface UpdateInventoryItemRequest {
  id: string;
  title: string;
  unit: string;
  min_quantity_threshold: number;
  linkedMenuItemIds?: string[];
}

export interface InventoryMutationResponse {
  success: boolean;
  message: string;
}

export type InventoryDetailPeriod =
  | 'today'
  | 'yesterday'
  | 'this_month'
  | 'last_month'
  | 'last_7days';

export type InventoryMovementTypeFilter = 'all' | 'in' | 'out' | 'wastage';

export type StockMovementType = 'IN' | 'OUT' | 'WASTAGE';

export interface InventoryDetailLinkedMenuItem {
  menu_item_id: string;
  menu_item_title: string;
  automatic_inventory_enabled?: boolean;
}

export interface InventoryMovement {
  id: string;
  type: StockMovementType;
  quantity: string;
  previous_quantity: string;
  new_quantity: string;
  note: string;
  created_by: string;
  created_at: string;
  order_id: string | null;
  formatted_token: string | null;
  order: unknown;
  order_token: string | null;
  order_display: string | null;
  remark_display: string | null;
  updated_by_name: string;
  is_order_related: boolean;
}

export interface InventoryDetailSummary {
  totalIn: number;
  totalOut: number;
  totalWastage: number;
  movementCount: number;
  currentStock: number;
}

export interface InventoryDetailResponse {
  item: InventoryItem & {
    linked_menu_item?: InventoryDetailLinkedMenuItem | null;
  };
  linkedMenuItems: InventoryDetailLinkedMenuItem[];
  recipes: Array<
    InventoryDetailLinkedMenuItem & {
      recipe_quantity?: string;
      variant_id?: string | null;
      addon_id?: string | null;
    }
  >;
  summary: InventoryDetailSummary;
  movements: InventoryMovement[];
}

export interface InventoryDetailQueryArgs {
  id: string;
  type?: InventoryDetailPeriod;
  movementType?: InventoryMovementTypeFilter;
}

export interface AddStockMovementRequest {
  id: string;
  movementType: StockMovementType;
  quantity: number;
  note?: string;
}

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: baseQueryWithReauthHandling,
  tagTypes: ['Inventory', 'InventoryDetail'],
  endpoints: builder => ({
    getInventory: builder.query<InventoryListResponse, InventoryStatus | void>({
      query: status => ({
        url: '/inventory',
        method: 'GET',
        params: {status: status ?? 'all'},
      }),
      providesTags: ['Inventory'],
    }),
    getLinkableMenuItems: builder.query<LinkableMenuItemsResponse, void>({
      query: () => ({
        url: '/inventory/linkable-menu-items',
        method: 'GET',
        params: {lang: 'en'},
      }),
      transformResponse: (response: unknown) =>
        parseLinkableMenuItemsResponse(response),
    }),
    addInventoryItem: builder.mutation<
      AddInventoryItemResponse,
      AddInventoryItemRequest
    >({
      query: body => ({
        url: '/inventory/add-item',
        method: 'POST',
        params: {lang: 'en'},
        body,
      }),
      invalidatesTags: ['Inventory'],
    }),
    updateInventoryItem: builder.mutation<
      InventoryMutationResponse,
      UpdateInventoryItemRequest
    >({
      query: ({id, title, unit, min_quantity_threshold, linkedMenuItemIds}) => ({
        url: `/inventory/${id}`,
        method: 'PUT',
        params: {lang: 'en'},
        body: {
          title,
          unit,
          min_quantity_threshold,
          ...(linkedMenuItemIds?.length
            ? {linkedMenuItemIds}
            : {}),
        },
      }),
      invalidatesTags: ['Inventory'],
    }),
    deleteInventoryItem: builder.mutation<
      InventoryMutationResponse,
      string
    >({
      query: id => ({
        url: `/inventory/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Inventory'],
    }),
    getInventoryDetail: builder.query<
      InventoryDetailResponse,
      InventoryDetailQueryArgs
    >({
      query: ({id, type = 'last_7days', movementType = 'all'}) => ({
        url: `/inventory/${id}/detail`,
        method: 'GET',
        params: {lang: 'en', type, movementType},
      }),
      providesTags: (_result, _error, {id}) => [
        {type: 'InventoryDetail', id},
      ],
    }),
    addStockMovement: builder.mutation<
      InventoryMutationResponse,
      AddStockMovementRequest
    >({
      query: ({id, movementType, quantity, note}) => ({
        url: `/inventory/${id}/add-stock-movement`,
        method: 'PATCH',
        params: {lang: 'en'},
        body: {
          movementType,
          quantity,
          note: note ?? '',
        },
      }),
      invalidatesTags: (_result, _error, {id}) => [
        'Inventory',
        {type: 'InventoryDetail', id},
      ],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetLinkableMenuItemsQuery,
  useGetInventoryDetailQuery,
  useAddInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useAddStockMovementMutation,
} = inventoryApi;
