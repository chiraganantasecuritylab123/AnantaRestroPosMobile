import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {MenuItem, PaymentType, StoreTable} from '../services/posApi';

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string | null;
}

export type DeliveryType = 'dinein' | 'takeaway' | 'delivery';

interface CustomerRef {
  phone: string;
  name: string;
}

interface CartState {
  items: CartItem[];
  deliveryType: DeliveryType;
  tableId: string | number | null;
  selectedPaymentType: string | number | null;
  selectedCustomer: CustomerRef | null;
  selectedTable: StoreTable | null;
  paymentTypes: PaymentType[];
}

const initialState: CartState = {
  items: [],
  deliveryType: 'dinein',
  tableId: null,
  selectedPaymentType: null,
  selectedCustomer: null,
  selectedTable: null,
  paymentTypes: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<MenuItem>) {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
        return;
      }
      state.items.push({...action.payload, quantity: 1, notes: null});
    },
    setItemQuantity(
      state,
      action: PayloadAction<{id: number; quantity: number}>,
    ) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (!item) {
        return;
      }
      item.quantity = action.payload.quantity;
      if (item.quantity <= 0) {
        state.items = state.items.filter(i => i.id !== action.payload.id);
      }
    },
    setItemNotes(state, action: PayloadAction<{id: number; notes: string}>) {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        item.notes = action.payload.notes;
      }
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.selectedCustomer = null;
      state.selectedPaymentType = null;
    },
    setDeliveryType(state, action: PayloadAction<DeliveryType>) {
      state.deliveryType = action.payload;
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
      if (!state.selectedPaymentType && action.payload.length) {
        state.selectedPaymentType = action.payload[0].id;
      }
    },
    setPaymentType(state, action: PayloadAction<string | number>) {
      state.selectedPaymentType = action.payload;
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
  setSelectedCustomer,
  setTable,
  setPaymentTypes,
  setPaymentType,
} = cartSlice.actions;

export const cartReducer = cartSlice.reducer;

