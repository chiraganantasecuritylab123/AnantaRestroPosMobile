export interface ApiOrderLineItem {
  id: string;
  item_title: string;
  variant_title?: string | null;
  quantity: number;
  price: string;
  final_price?: string;
  status: string;
  notes?: string | null;
}

export interface ApiOrderRecord {
  id: string;
  date: string;
  delivery_type: string;
  customer_type: string;
  customer_name: string;
  table_id: string | null;
  table_title: string | null;
  status: string;
  payment_status: string;
  paid_amount: number;
  grand_total: number;
  token_no: string;
  formatted_token?: string;
  payment_type_title: string | null;
  waiter_name?: string;
  items?: ApiOrderLineItem[];
  order_id: string;
  order_date: string;
  order_status: string;
  item_count: number;
  total_amount: number;
  due_amount: number;
  display_token?: string;
  order_no?: string;
}

export interface ApiOrderGroup {
  table_id: string | null;
  table_title: string;
  floor: string | null;
  orders: ApiOrderRecord[];
  order_ids: string[];
}

export interface GetOrdersResponse {
  orders: ApiOrderGroup[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
  hasMore?: boolean;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
    hasMore?: boolean;
  };
}

export interface GetOrdersQueryArgs {
  page?: number;
  limit?: number;
  status?: string;
  deliveryType?: string;
}

export interface PaginatedOrdersResult {
  items: OrderListItem[];
  page: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

export interface OrderLineItem {
  id: string;
  title: string;
  variantTitle?: string | null;
  quantity: number;
  price: number;
  notes?: string | null;
}

export interface OrderListItem {
  id: string;
  tokenNo: string;
  orderId: string;
  total: number;
  order_no: string;
  dueAmount: number;
  customerName: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  tableTitle?: string | null;
  waiterName?: string;
  itemCount: number;
  items: OrderLineItem[];
}

function mapOrderLineItems(order: ApiOrderRecord): OrderLineItem[] {
  return (order.items ?? []).map(line => ({
    id: line.id,
    title: line.item_title?.trim() || 'Item',
    variantTitle: line.variant_title?.trim() || null,
    quantity: Number(line.quantity ?? 1),
    price: Number(line.final_price ?? line.price ?? 0),
    notes: line.notes?.trim() || null,
  }));
}

function mapOrderRecord(
  order: ApiOrderRecord,
  groupTableTitle?: string,
): OrderListItem {
  const token =
    order.display_token ??
    order.formatted_token ??
    order.token_no ??
    order.order_no ??
    '—';

  const paymentMethod =
    order.payment_type_title?.trim() ||
    (order.payment_status === 'pending' ? 'Pending' : undefined);

  return {
    id: order.id ?? order.order_id,
    tokenNo: String(token),
    orderId: order.order_id ?? order.id,
    total: Number(order.grand_total ?? order.total_amount ?? 0),
    dueAmount: Number(order.due_amount ?? 0),
    customerName: order.customer_name ?? 'Walk-in',
    order_no: order.order_no ?? '',
    createdAt: order.date ?? order.order_date ?? '',
    status: order.order_status ?? order.status ?? 'created',
    paymentStatus: order.payment_status ?? 'pending',
    paymentMethod,
    tableTitle: order.table_title ?? groupTableTitle ?? null,
    waiterName: order.waiter_name,
    itemCount: Number(order.item_count ?? order.items?.length ?? 0),
    items: mapOrderLineItems(order),
  };
}

export function parseOrdersPage(
  response: GetOrdersResponse | undefined,
  arg: Required<Pick<GetOrdersQueryArgs, 'page' | 'limit'>>,
): PaginatedOrdersResult {
  const items = flattenOrdersResponse(response);
  const {page, limit} = arg;

  const total = response?.total ?? response?.meta?.total;
  const explicitHasMore =
    response?.has_more ??
    response?.hasMore ??
    response?.meta?.has_more ??
    response?.meta?.hasMore;

  const hasMore =
    explicitHasMore !== undefined
      ? Boolean(explicitHasMore)
      : total != null
        ? page * limit < total
        : items.length >= limit;

  return {items, page, limit, total, hasMore};
}

export function flattenOrdersResponse(
  response: GetOrdersResponse | undefined,
): OrderListItem[] {
  const groups = response?.orders ?? [];
  const flat: OrderListItem[] = [];

  for (const group of groups) {
    for (const order of group.orders ?? []) {
      flat.push(mapOrderRecord(order, group.table_title));
    }
  }

  return flat.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function paymentBadgeLabel(item: OrderListItem): string | undefined {
  if (item.paymentMethod?.trim()) {
    return item.paymentMethod;
  }
  if (item.paymentStatus === 'pending') {
    return 'Pending';
  }
  if (item.paymentStatus === 'paid') {
    return 'Paid';
  }
  return item.paymentStatus;
}
