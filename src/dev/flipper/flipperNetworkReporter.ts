import type {FlipperNetworkLogEntry} from './networkTypes';
import {logEntryToConsole} from './networkSerializer';

/**
 * Dev-only network logging to Metro console (grouped, full payloads).
 * Native Flipper Network plugin (OkHttp / NSURLSession) captures the same
 * traffic in the Flipper Desktop **Network** tab with full response bodies.
 */
export function reportNetworkLog(entry: FlipperNetworkLogEntry) {
  if (!__DEV__) {
    return;
  }
  logEntryToConsole(entry);
}
