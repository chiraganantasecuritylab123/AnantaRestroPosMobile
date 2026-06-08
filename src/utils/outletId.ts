import type {RootState} from '../store';
import type {PosInitResponse} from '../services/posApi';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/** Do not use tenant_id as outlet — backend returns INVALID_OUTLET. */
function base64Decode(input: string): string {
  const atobFn = (
    globalThis as {atob?: (s: string) => string}
  ).atob;
  if (typeof atobFn === 'function') {
    return atobFn(input);
  }

  let output = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (ch === '=') {
      break;
    }
    const idx = B64.indexOf(ch);
    if (idx === -1) {
      continue;
    }
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) {
      return null;
    }
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = base64Decode(padded);
    try {
      return JSON.parse(
        decodeURIComponent(
          raw
            .split('')
            .map((c: string) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join(''),
        ),
      ) as Record<string, unknown>;
    } catch {
      return JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
    return null;
  }
}

function asOutletId(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return asOutletId((value as {id: unknown}).id);
  }
  return String(value);
}

export function isTenantIdAsOutlet(
  outletId: string | null | undefined,
  tenantId: number | string | null | undefined,
): boolean {
  if (outletId == null || outletId === '' || tenantId == null) {
    return false;
  }
  return String(outletId) === String(tenantId);
}

/** First non-empty outlet id that is not the tenant id. */
export function pickOutletId(
  tenantId: number | string | null | undefined,
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c && !isTenantIdAsOutlet(c, tenantId)) {
      return c;
    }
  }
  return null;
}

function pickOutletClaim(payload: Record<string, unknown> | null): string | null {
  if (!payload) {
    return null;
  }
  const keys = [
    'outlet_id',
    'outletId',
    'default_outlet_id',
    'defaultOutletId',
    'current_outlet_id',
    'currentOutletId',
  ];
  for (const key of keys) {
    const id = asOutletId(payload[key]);
    if (id) {
      return id;
    }
  }
  return asOutletId(payload.outlet);
}

export function extractOutletIdFromToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }
  return pickOutletClaim(decodeJwtPayload(token));
}

type OutletRow = {
  id?: number | string;
  outlet_id?: number | string;
  is_default?: boolean;
  isDefault?: boolean;
};

export function extractOutletIdFromPosInit(
  data: PosInitResponse | undefined,
): string | null {
  if (!data) {
    return null;
  }
  const raw = data as PosInitResponse & {
    outlet?: {id?: number | string};
    currentOutlet?: {id?: number | string};
    outlets?: OutletRow[];
  };
  const settings = raw.storeSettings as typeof raw.storeSettings & {
    outlet_id?: string | number;
    outletId?: string | number;
    current_outlet_id?: string | number;
  };

  const fromOutletObject =
    asOutletId(raw.outlet) ?? asOutletId(raw.currentOutlet);
  if (fromOutletObject) {
    return fromOutletObject;
  }

  const outlets = raw.outlets ?? [];
  const preferred =
    outlets.find(o => o.is_default || o.isDefault) ?? outlets[0];
  const fromList =
    asOutletId(preferred?.id) ?? asOutletId(preferred?.outlet_id);
  if (fromList) {
    return fromList;
  }

  const candidates = [
    raw.outlet_id,
    raw.outletId,
    raw.current_outlet_id,
    settings?.outlet_id,
    settings?.outletId,
    settings?.current_outlet_id,
  ];

  for (const c of candidates) {
    const id = asOutletId(c);
    if (id) {
      return id;
    }
  }
  return null;
}

export function extractOutletIdFromUser(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const u = user as Record<string, unknown>;
  const candidates = [u.outlet_id, u.outletId, u.default_outlet_id];
  for (const c of candidates) {
    const id = asOutletId(c);
    if (id) {
      return id;
    }
  }
  return null;
}

/**
 * Resolves x-outlet-id for API calls. Never falls back to tenant_id.
 */
export function resolveOutletId(state: RootState): string | null {
  const tenantId = state.authToken.user?.tenant_id;
  return pickOutletId(
    tenantId,
    state.authToken.outletId,
    extractOutletIdFromUser(state.authToken.user),
    state.authToken.value
      ? extractOutletIdFromToken(state.authToken.value)
      : null,
  );
}
