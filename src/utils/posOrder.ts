import type {CartItem, DeliveryType} from '../features/cartSlice';
import type {
  ApiCartLineItem,
  CreateOrderAndInvoiceRequest,
  CreateOrderAndInvoiceResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from '../services/orderApi';
import type {PaymentType} from '../services/posApi';

type CustomerRef = {phone: string; name: string} | null;

export type BuildOrderInput = {
  items: CartItem[];
  deliveryType: DeliveryType;
  selectedCustomer: CustomerRef;
  tableId: string | number | null;
  selectedPaymentType?: string | number | null;
  selectedQrOrderItem?: string | number | null;
  serviceCharge?: string | number | null;
};

export function computeCartAmount(
  items: CartItem[],
  serviceChargeRate = 0,
) {
  const netTotal = items.reduce(
    (sum, i) => sum + Number(i?.net_price ?? 0) * Number(i?.quantity ?? 0),
    0,
  );

  const taxTotal = items.reduce((sum, i) => {
    const lineAmount = Number(i?.net_price ?? 0) * Number(i?.quantity ?? 0);
    const rate = Number(i?.tax_rate ?? 0);
    if (rate <= 0) {
      return sum;
    }
    const taxType = String(i?.tax_type ?? '').toLowerCase();
    if (taxType === 'exclusive') {
      return sum + lineAmount * (rate / 100);
    }
    // Inclusive tax: net_price is what the customer pays; extract tax for breakdown.
    return sum + lineAmount - lineAmount / (1 + rate / 100);
  }, 0);

  const exclusiveTaxTotal = items.reduce((sum, i) => {
    const lineAmount = Number(i?.net_price ?? 0) * Number(i?.quantity ?? 0);
    const rate = Number(i?.tax_rate ?? 0);
    const taxType = String(i?.tax_type ?? '').toLowerCase();
    if (taxType === 'exclusive' && rate > 0) {
      return sum + lineAmount * (rate / 100);
    }
    return sum;
  }, 0);

  const serviceChargeTotal = netTotal * serviceChargeRate;
  const total = netTotal + exclusiveTaxTotal + serviceChargeTotal;
  return {netTotal, taxTotal, serviceChargeTotal, total};
}

export function findCashPaymentType(
  paymentTypes: PaymentType[],
): PaymentType | undefined {
  return (
    paymentTypes.find(pt => (pt?.title ?? '').toLowerCase().includes('cash')) ??
    paymentTypes[0]
  );
}

export function itemNeedsConfiguration(item: {
  variants?: unknown[];
  addons?: unknown[];
}): boolean {
  const variants = (item?.variants ?? []) as unknown[];
  const addons = (item?.addons ?? []) as unknown[];
  return variants.length > 0 || addons.length > 0;
}

export function buildCartLineKey(
  menuItemId: number,
  variantId: string | null,
  addonIds: string[],
): string {
  const addons = [...addonIds].sort().join(',');
  return `${menuItemId}:${variantId ?? 'base'}:${addons}`;
}

export function resolveServiceChargeRate(
  deliveryType: DeliveryType,
  serviceChargeSetting?: string | number | null,
): number {
  if (normalizeDeliveryType(deliveryType) !== 'dinein') {
    return 0;
  }
  const pct = Number(serviceChargeSetting ?? 0);
  if (Number.isFinite(pct) && pct > 0) {
    return pct / 100;
  }
  return 0.1;
}

/** API accepts dinein | takeaway; map delivery → takeaway */
export function normalizeDeliveryType(
  deliveryType: DeliveryType,
): 'dinein' | 'takeaway' {
  if (deliveryType === 'dinein') {
    return 'dinein';
  }
  return 'takeaway';
}

export function mapCartItemToApiLine(item: CartItem): ApiCartLineItem {
  const finalPrice = Number(item?.net_price ?? item?.price ?? 0);
  const basePrice = Number(item?.price ?? item?.net_price ?? finalPrice);
  const variants = (item?.variants ?? []) as {id: string}[];
  const addons = (item?.addons ?? []) as {id: string}[];

  return {
    item_id: String(item.id),
    quantity: Number(item.quantity) || 1,
    price: finalPrice,
    base_price: basePrice,
    final_price: finalPrice,
    discount_amount: Math.max(0, Math.round((basePrice - finalPrice) * 100) / 100),
    offer_applied: false,
    offerLineId: null,
    is_reward: false,
    linked_offer_id: null,
    variant_id: variants[0]?.id != null ? String(variants[0].id) : null,
    addons_ids: addons.map(a => String(a.id)),
    notes: item?.notes?.trim() ? item.notes.trim() : null,
    recipeItems: item?.recipeItems ?? [],
  };
}

export function buildCreateOrderRequest(
  input: BuildOrderInput,
): CreateOrderRequest {
  const deliveryType = normalizeDeliveryType(input.deliveryType);
  const hasCustomer = !!input.selectedCustomer?.phone;

  return {
    cart: input.items.map(mapCartItemToApiLine),
    deliveryType,
    customerType: hasCustomer ? 'CUSTOMER' : 'WALKIN',
    customerId: hasCustomer ? input.selectedCustomer : null,
    tableId:
      deliveryType === 'dinein' && input.tableId != null && input.tableId !== ''
        ? String(input.tableId)
        : null,
    selectedQrOrderItem: input.selectedQrOrderItem ?? null,
  };
}

export function buildCreateOrderAndInvoiceRequest(
  input: BuildOrderInput,
): CreateOrderAndInvoiceRequest {
  const base = buildCreateOrderRequest(input);
  const serviceChargeRate = resolveServiceChargeRate(
    input.deliveryType,
    input.serviceCharge,
  );
  const amounts = computeCartAmount(input.items, serviceChargeRate);
  const paymentType = input.selectedPaymentType;

  if (
    paymentType === null ||
    paymentType === undefined ||
    paymentType === ''
  ) {
    throw new Error('Payment type is required for create-order-and-invoice');
  }

  return {
    ...base,
    ...amounts,
    selectedPaymentType: String(paymentType),
  };
}

export function parseOrderId(value: string | number | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseTokenNo(
  res: CreateOrderResponse | CreateOrderAndInvoiceResponse,
): number {
  if (typeof res?.tokenNoNumeric === 'number' && Number.isFinite(res.tokenNoNumeric)) {
    return res.tokenNoNumeric;
  }
  const n = Number(res?.tokenNo);
  if (Number.isFinite(n)) {
    return n;
  }
  const digits = String(res?.tokenNo ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function formatTokenLabel(
  res: CreateOrderResponse | CreateOrderAndInvoiceResponse,
): string {
  const payload = normalizeOrderCreateResponse(res);
  if (payload.formattedToken != null && String(payload.formattedToken).trim()) {
    return String(payload.formattedToken).trim();
  }
  return String(payload.tokenNo ?? '').trim();
}

function normalizeOrderCreateResponse(
  res: CreateOrderResponse | CreateOrderAndInvoiceResponse,
): CreateOrderResponse | CreateOrderAndInvoiceResponse {
  const row = res as CreateOrderResponse &
    CreateOrderAndInvoiceResponse & {data?: unknown};
  if (row.data && typeof row.data === 'object') {
    return {...row, ...(row.data as CreateOrderResponse)};
  }
  return row;
}
