import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface OrderHistoryItem {
  id: string;
  tokenNo: number;
  orderId: string | number | undefined;
  invoiceId?: number | string | undefined;
  total: number;
  customerName: string;
  createdAt: string;
  status: 'created';
  paymentMethod?: string;
}

interface OrderHistoryState {
  items: OrderHistoryItem[];
}

const initialState: OrderHistoryState = {
  items: [],
};

const orderHistorySlice = createSlice({
  name: 'orderHistory',
  initialState,
  reducers: {
    addOrderHistoryItem(state, action: PayloadAction<OrderHistoryItem>) {
      state.items.unshift(action.payload);
    },
  },
});

export const {addOrderHistoryItem} = orderHistorySlice.actions;
export const orderHistoryReducer = orderHistorySlice.reducer;

