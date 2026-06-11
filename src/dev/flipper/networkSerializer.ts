import type {FlipperNetworkLogEntry} from './networkTypes';

export function createRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function headersToRecord(
  headers?: HeadersInit | Record<string, string> | null,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [key, value] of headers) {
      out[key] = value;
    }
    return out;
  }
  return {...headers};
}

export function parseUrlParts(url: string): {
  url: string;
  queryParams?: Record<string, string>;
} {
  try {
    const parsed = new URL(url);
    const queryParams: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    return {
      url: parsed.toString(),
      queryParams:
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
    };
  } catch {
    return {url};
  }
}

type RnFormDataPart = {
  fieldName?: string;
  uri?: string;
  name?: string;
  type?: string;
  string?: string;
};

function appendFormDataPart(
  parts: string[],
  key: string,
  value: unknown,
): void {
  if (typeof value === 'object' && value != null && 'uri' in value) {
    const file = value as {uri?: string; name?: string; type?: string};
    parts.push(
      `${key}: [file ${file.name ?? 'blob'} ${file.type ?? ''} ${file.uri ?? ''}]`,
    );
    return;
  }
  parts.push(`${key}: ${String(value)}`);
}

function formDataToLogString(body: FormData): string {
  const parts: string[] = [];

  if (typeof body.forEach === 'function') {
    body.forEach((value, key) => {
      appendFormDataPart(parts, key, value);
    });
    return parts.length ? parts.join('\n') : '[FormData empty]';
  }

  const getParts = (body as FormData & {getParts?: () => RnFormDataPart[]})
    .getParts;
  if (typeof getParts === 'function') {
    for (const part of getParts.call(body)) {
      const key = part.fieldName ?? 'field';
      if (part.uri) {
        parts.push(
          `${key}: [file ${part.name ?? 'blob'} ${part.type ?? ''} ${part.uri}]`,
        );
      } else {
        parts.push(`${key}: ${part.string ?? ''}`);
      }
    }
    return parts.length ? parts.join('\n') : '[FormData empty]';
  }

  return '[FormData]';
}

export async function bodyToLogString(body: unknown): Promise<string | undefined> {
  if (body == null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return formDataToLogString(body);
  }
  if (typeof body === 'object') {
    try {
      return JSON.stringify(body, null, 2);
    } catch {
      return String(body);
    }
  }
  return String(body);
}

export async function responseBodyToString(response: Response): Promise<string> {
  const clone = response.clone();
  const contentType = clone.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const json = await clone.json();
      return JSON.stringify(json, null, 2);
    }
    return await clone.text();
  } catch (e) {
    return `[Could not read response body: ${e}]`;
  }
}

export function logEntryToConsole(entry: FlipperNetworkLogEntry) {
  const label = `[${entry.source.toUpperCase()}] ${entry.method} ${entry.url} → ${entry.status ?? 'ERR'} (${entry.durationMs ?? '?'}ms)`;
  // eslint-disable-next-line no-console
  console.groupCollapsed(label);
  // eslint-disable-next-line no-console
  console.log(entry);
  // eslint-disable-next-line no-console
  console.groupEnd();
}
