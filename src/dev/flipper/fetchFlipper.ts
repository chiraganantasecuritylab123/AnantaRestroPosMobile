import {
  bodyToLogString,
  createRequestId,
  headersToRecord,
  parseUrlParts,
  responseBodyToString,
} from './networkSerializer';
import {reportNetworkLog} from './flipperNetworkReporter';

type FetchArgs = Parameters<typeof fetch>;

function parseFetchInput(input: FetchArgs[0], init?: FetchArgs[1]) {
  const method = (init?.method ?? 'GET').toUpperCase();
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const {url: fullUrl, queryParams} = parseUrlParts(url);
  const requestHeaders = headersToRecord(init?.headers);
  return {method, fullUrl, queryParams, requestHeaders, init};
}

/**
 * Dev-only fetch wrapper: logs full request/response payloads for Flipper and Metro.
 * Does not change response behavior for app code.
 */
export function setupFetchFlipperLogging() {
  if (!__DEV__) {
    return;
  }

  const originalFetch = global.fetch;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const id = createRequestId();
    const started = Date.now();
    const {method, fullUrl, queryParams, requestHeaders, init: requestInit} =
      parseFetchInput(input, init);
    const requestBody = await bodyToLogString(requestInit?.body);

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - started;
      let responseBody: string | undefined;
      try {
        responseBody = await responseBodyToString(response);
      } catch (e) {
        responseBody = `[response read error: ${e}]`;
      }

      reportNetworkLog({
        id,
        timestamp: started,
        method,
        url: fullUrl,
        queryParams,
        requestHeaders,
        requestBody,
        status: response.status,
        responseHeaders: headersToRecord(
          Object.fromEntries(response.headers.entries()),
        ),
        responseBody,
        durationMs,
        source: 'fetch',
      });

      return response;
    } catch (error) {
      reportNetworkLog({
        id,
        timestamp: started,
        method,
        url: fullUrl,
        queryParams,
        requestHeaders,
        requestBody,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
        source: 'fetch',
      });
      throw error;
    }
  };
}
