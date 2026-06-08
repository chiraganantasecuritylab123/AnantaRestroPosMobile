import type {Middleware} from '@reduxjs/toolkit';
import {clearAllPosOrderDrafts} from '../storage/posOrderDraftStorage';
import type {CartState} from '../features/cartSlice';

type CartPersistRootState = {
  cart: CartState;
  authToken: {outletId: string | null};
};

/** Draft orders are saved explicitly via "Draft" — not auto-synced from cart edits. */
export const cartPersistenceMiddleware: Middleware<{}, CartPersistRootState> =
  storeApi => next => action => {
    const result = next(action);
    const type = (action as {type?: string}).type;

    if (type === 'authToken/logout') {
      const outletId = storeApi.getState().authToken.outletId;
      void clearAllPosOrderDrafts(outletId);
    }

    return result;
  };
