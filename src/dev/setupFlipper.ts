import {setupAxiosFlipperLogging} from './flipper/axiosFlipper';
import {setupFetchFlipperLogging} from './flipper/fetchFlipper';

/**
 * Dev-only Flipper helpers. Safe to import from index.js behind __DEV__.
 * - Native: Flipper Network plugin (OkHttp / NSURLSession) via ReactNativeFlipper
 * - JS: fetch + axios logging with full bodies for Flipper bridge + Metro console
 */
export function setupFlipperDevTools() {
  if (!__DEV__) {
    return;
  }

  setupFetchFlipperLogging();
  setupAxiosFlipperLogging();
}
