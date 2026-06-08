export type FlipperNetworkLogEntry = {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: string;
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  durationMs?: number;
  error?: string;
  source: 'fetch' | 'axios';
};
