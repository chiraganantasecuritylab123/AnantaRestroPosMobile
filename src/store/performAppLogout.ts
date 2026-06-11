import {logout} from '../features/authTokenSlice';
import type {AppDispatch} from './store';

/**
 * Signs out on the server (optional) then clears local session.
 * RTK Query cache, cart, and order history are cleared by sessionLogoutMiddleware.
 */
export async function performAppLogout(
  dispatch: AppDispatch,
  signoutRequest?: () => Promise<unknown>,
): Promise<void> {
  if (signoutRequest) {
    try {
      await signoutRequest();
    } catch {
      // Local logout always runs even if the network call fails.
    }
  }
  dispatch(logout());
}
