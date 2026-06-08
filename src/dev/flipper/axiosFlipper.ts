import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  bodyToLogString,
  createRequestId,
  headersToRecord,
  parseUrlParts,
} from './networkSerializer';
import {reportNetworkLog} from './flipperNetworkReporter';

type FlipperAxiosMeta = {
  id: string;
  started: number;
  requestBody?: string;
};

function getMeta(
  config: InternalAxiosRequestConfig,
): FlipperAxiosMeta | undefined {
  return (config as InternalAxiosRequestConfig & {flipperMeta?: FlipperAxiosMeta})
    .flipperMeta;
}

function setMeta(config: InternalAxiosRequestConfig, meta: FlipperAxiosMeta) {
  (config as InternalAxiosRequestConfig & {flipperMeta?: FlipperAxiosMeta}).flipperMeta =
    meta;
}

function logAxiosSuccess(response: AxiosResponse) {
  const config = response.config;
  const meta = getMeta(config);
  if (!meta) {
    return;
  }

  const url = axios.getUri(config);
  const {url: fullUrl, queryParams} = parseUrlParts(url);

  let responseBody: string | undefined;
  try {
    responseBody =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);
  } catch {
    responseBody = String(response.data);
  }

  reportNetworkLog({
    id: meta.id,
    timestamp: meta.started,
    method: (config.method ?? 'get').toUpperCase(),
    url: fullUrl,
    queryParams,
    requestHeaders: headersToRecord(config.headers as Record<string, string>),
    requestBody: meta.requestBody,
    status: response.status,
    responseHeaders: headersToRecord(
      response.headers as Record<string, string>,
    ),
    responseBody,
    durationMs: Date.now() - meta.started,
    source: 'axios',
  });
}

function logAxiosFailure(error: AxiosError) {
  const config = error.config;
  if (!config) {
    return;
  }
  const meta = getMeta(config);
  if (!meta) {
    return;
  }

  const url = axios.getUri(config);
  const {url: fullUrl, queryParams} = parseUrlParts(url);

  let responseBody: string | undefined;
  if (error.response?.data != null) {
    try {
      responseBody =
        typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data, null, 2);
    } catch {
      responseBody = String(error.response.data);
    }
  }

  reportNetworkLog({
    id: meta.id,
    timestamp: meta.started,
    method: (config.method ?? 'get').toUpperCase(),
    url: fullUrl,
    queryParams,
    requestHeaders: headersToRecord(config.headers as Record<string, string>),
    requestBody: meta.requestBody,
    status: error.response?.status,
    responseHeaders: headersToRecord(
      error.response?.headers as Record<string, string> | undefined,
    ),
    responseBody,
    durationMs: Date.now() - meta.started,
    error: error.message,
    source: 'axios',
  });
}

/**
 * Dev-only Axios interceptors on the default axios instance (for any axios-based calls).
 * RTK Query in this app uses fetch; see fetchFlipper.ts.
 */
export function setupAxiosFlipperLogging() {
  if (!__DEV__) {
    return;
  }

  axios.interceptors.request.use(async config => {
    const requestBody = await bodyToLogString(config.data);
    setMeta(config, {
      id: createRequestId(),
      started: Date.now(),
      requestBody,
    });
    return config;
  });

  axios.interceptors.response.use(
    response => {
      logAxiosSuccess(response);
      return response;
    },
    error => {
      logAxiosFailure(error);
      return Promise.reject(error);
    },
  );
}
