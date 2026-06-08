import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {MenuItem, PaymentType, StoreTable} from '../services/posApi';
import {findCashPaymentType} from '../utils/posOrder';

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string | null;
  /** Unique line when same menu id has different variant/addon combos */
  lineKey?: string;
}

export type DeliveryType = 'dinein' | 'takeaway' | 'delivery';
export type BillMode = 'order' | 'invoice';

export interface CustomerRef {
  phone: string;
  name: string;
}

export type CartDraftSnapshot = Pick<
  CartState,
  | 'items'
  | 'deliveryType'
  | 'billMode'
  | 'tableId'
  | 'selectedPaymentType'
  | 'selectedCustomer'
  | 'selectedTable'
>;

interface CartState {
  items: CartItem[];
  deliveryType: DeliveryType;
  billMode: BillMode;
  tableId: string | number | null;
  selectedPaymentType: string | number | null;
  selectedCustomer: CustomerRef | null;
  selectedTable: StoreTable | null;
  paymentTypes: PaymentType[];
}

const initialState: CartState = {
  items: [],
  deliveryType: 'takeaway',
  billMode: 'order',
  tableId: null,
  selectedPaymentType: null,
  selectedCustomer: null,
  selectedTable: null,
  paymentTypes: [],
};

function applyCashDefault(state: CartState) {
  const cash = findCashPaymentType(state.paymentTypes);
  if (cash) {
    state.selectedPaymentType = cash.id;
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<MenuItem & {lineKey?: string}>) {
      const key = action.payload.lineKey;
      const existing = key
        ? state.items.find(i => i.lineKey === key)
        : state.items.find(i => i.id === action.payload.id && !i.lineKey);
      if (existing) {
        existing.quantity += 1;
        return;
      }
      state.items.push({
        ...action.payload,
        quantity: 1,
        notes: null,
        lineKey: key,
      });
    },
    setItemQuantity(
      state,
      action: PayloadAction<{id: number; quantity: number; lineKey?: string}>,
    ) {
      const item = action.payload.lineKey
        ? state.items.find(i => i.lineKey === action.payload.lineKey)
        : state.items.find(i => i.id === action.payload.id);
      if (!item) {
        return;
      }
      item.quantity = action.payload.quantity;
      if (item.quantity <= 0) {
        state.items = state.items.filter(i =>
          action.payload.lineKey
            ? i.lineKey !== action.payload.lineKey
            : i.id !== action.payload.id,
        );
      }
    },
    setItemNotes(
      state,
      action: PayloadAction<{id: number; notes: string; lineKey?: string}>,
    ) {
      const item = action.payload.lineKey
        ? state.items.find(i => i.lineKey === action.payload.lineKey)
        : state.items.find(i => i.id === action.payload.id);
      if (item) {
        item.notes = action.payload.notes;
      }
    },
    removeItem(
      state,
      action: PayloadAction<{id: number; lineKey?: string}>,
    ) {
      if (action.payload.lineKey) {
        state.items = state.items.filter(
          i => i.lineKey !== action.payload.lineKey,
        );
      } else {
        state.items = state.items.filter(i => i.id !== action.payload.id);
      }
    },
    clearCart(
      state,
      _action: PayloadAction<{keepDraft?: boolean} | undefined>,
    ) {
      state.items = [];
      state.selectedCustomer = null;
      state.deliveryType = 'takeaway';
      state.billMode = 'order';
      state.tableId = null;
      state.selectedTable = null;
      applyCashDefault(state);
    },
    setDeliveryType(state, action: PayloadAction<DeliveryType>) {
      state.deliveryType = action.payload;
    },
    setBillMode(state, action: PayloadAction<BillMode>) {
      state.billMode = action.payload;
    },
    setSelectedCustomer(state, action: PayloadAction<CustomerRef | null>) {
      state.selectedCustomer = action.payload;
    },
    setTable(state, action: PayloadAction<StoreTable | null>) {
      state.selectedTable = action.payload;
      state.tableId = action.payload ? String(action.payload.id) : null;
    },
    setPaymentTypes(state, action: PayloadAction<PaymentType[]>) {
      state.paymentTypes = action.payload;
      applyCashDefault(state);
    },
    setPaymentType(state, action: PayloadAction<string | number>) {
      state.selectedPaymentType = action.payload;
    },
    restoreCartDraft(state, action: PayloadAction<CartDraftSnapshot>) {
      state.items = action.payload.items;
      state.deliveryType = action.payload.deliveryType;
      state.billMode = action.payload.billMode;
      state.tableId = action.payload.tableId;
      state.selectedCustomer = action.payload.selectedCustomer;
      state.selectedTable = action.payload.selectedTable;
      if (action.payload.selectedPaymentType != null) {
        state.selectedPaymentType = action.payload.selectedPaymentType;
      } else {
        applyCashDefault(state);
      }
    },
  },
});

export const {
  addItem,
  setItemQuantity,
  setItemNotes,
  removeItem,
  clearCart,
  setDeliveryType,
  setBillMode,
  setSelectedCustomer,
  setTable,
  setPaymentTypes,
  setPaymentType,
  restoreCartDraft,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;
