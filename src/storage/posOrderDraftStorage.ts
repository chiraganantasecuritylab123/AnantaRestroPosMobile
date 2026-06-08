import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BillMode,
  CartItem,
  DeliveryType,
} from '../features/cartSlice';
import type {StoreTable} from '../services/posApi';

const DRAFTS_KEY_PREFIX = 'pos.order_drafts.v2';
const LEGACY_DRAFT_KEY_PREFIX = 'pos.order_draft.v1';
const MAX_DRAFTS = 50;

export type PosOrderDraftCustomer = {
  phone: string;
  name: string;
};

export type PosOrderDraft = {
  id: string;
  items: CartItem[];
  deliveryType: DeliveryType;
  billMode: BillMode;
  tableId: string | number | null;
  selectedPaymentType: string | number | null;
  selectedCustomer: PosOrderDraftCustomer | null;
  selectedTable: StoreTable | null;
  savedAt: string;
};

export type PosOrderDraftInput = Omit<PosOrderDraft, 'id' | 'savedAt'> & {
  savedAt?: string;
};

function draftsKey(outletId: string | null | undefined): string {
  const id = outletId?.trim() || 'default';
  return `${DRAFTS_KEY_PREFIX}:${id}`;
}

function legacyDraftKey(outletId: string | null | undefined): string {
  const id = outletId?.trim() || 'default';
  return `${LEGACY_DRAFT_KEY_PREFIX}:${id}`;
}

function newDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidDraft(value: unknown): value is PosOrderDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const d = value as PosOrderDraft;
  return Array.isArray(d.items) && d.items.length > 0 && typeof d.savedAt === 'string';
}

function normalizeDraft(raw: unknown, fallbackId?: string): PosOrderDraft | null {
  if (!isValidDraft(raw)) {
    return null;
  }
  const d = raw as PosOrderDraft;
  return {
    ...d,
    id: d.id?.trim() || fallbackId || newDraftId(),
  };
}

async function persistDrafts(
  outletId: string | null | undefined,
  drafts: PosOrderDraft[],
): Promise<void> {
  const valid = drafts.filter(d => d.items.length > 0).slice(0, MAX_DRAFTS);
  if (valid.length === 0) {
    await AsyncStorage.removeItem(draftsKey(outletId));
    return;
  }
  await AsyncStorage.setItem(draftsKey(outletId), JSON.stringify(valid));
}

async function migrateLegacyDraft(
  outletId: string | null | undefined,
): Promise<PosOrderDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(legacyDraftKey(outletId));
    if (!raw) {
      return [];
    }
    const parsed = normalizeDraft(JSON.parse(raw) as unknown);
    if (!parsed) {
      return [];
    }
    await AsyncStorage.removeItem(legacyDraftKey(outletId));
    const drafts = [parsed];
    await persistDrafts(outletId, drafts);
    return drafts;
  } catch {
    return [];
  }
}

/** All saved draft orders for this outlet (newest first). */
export async function loadPosOrderDrafts(
  outletId: string | null | undefined,
): Promise<PosOrderDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(draftsKey(outletId));
    if (!raw) {
      return migrateLegacyDraft(outletId);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const drafts = parsed
      .map((entry, index) => normalizeDraft(entry, `draft-legacy-${index}`))
      .filter((d): d is PosOrderDraft => d != null)
      .sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
    return drafts;
  } catch {
    return [];
  }
}

/** Append a new draft order (does not merge with existing drafts). */
export async function addPosOrderDraft(
  outletId: string | null | undefined,
  input: PosOrderDraftInput,
): Promise<PosOrderDraft | null> {
  if (!input.items.length) {
    return null;
  }
  try {
    const draft: PosOrderDraft = {
      ...input,
      id: newDraftId(),
      savedAt: input.savedAt ?? new Date().toISOString(),
    };
    const existing = await loadPosOrderDrafts(outletId);
    await persistDrafts(outletId, [draft, ...existing]);
    return draft;
  } catch {
    return null;
  }
}

export async function removePosOrderDraft(
  outletId: string | null | undefined,
  draftId: string,
): Promise<void> {
  try {
    const existing = await loadPosOrderDrafts(outletId);
    await persistDrafts(
      outletId,
      existing.filter(d => d.id !== draftId),
    );
  } catch {
    // ignore
  }
}

export async function clearAllPosOrderDrafts(
  outletId: string | null | undefined,
): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      draftsKey(outletId),
      legacyDraftKey(outletId),
    ]);
  } catch {
    // ignore
  }
}

/** @deprecated Use loadPosOrderDrafts — returns newest draft only. */
export async function loadPosOrderDraft(
  outletId: string | null | undefined,
): Promise<PosOrderDraft | null> {
  const drafts = await loadPosOrderDrafts(outletId);
  return drafts[0] ?? null;
}

/** @deprecated Use addPosOrderDraft — replaces entire list with one draft. */
export async function savePosOrderDraft(
  outletId: string | null | undefined,
  draft: Omit<PosOrderDraft, 'id'> & {id?: string},
): Promise<void> {
  await addPosOrderDraft(outletId, {
    items: draft.items,
    deliveryType: draft.deliveryType,
    billMode: draft.billMode,
    tableId: draft.tableId,
    selectedPaymentType: draft.selectedPaymentType,
    selectedCustomer: draft.selectedCustomer,
    selectedTable: draft.selectedTable,
    savedAt: draft.savedAt,
  });
}

/** @deprecated Use clearAllPosOrderDrafts or removePosOrderDraft. */
export async function clearPosOrderDraft(
  outletId: string | null | undefined,
): Promise<void> {
  await clearAllPosOrderDrafts(outletId);
}

export function draftOrderMeta(draft: PosOrderDraft) {
  const lineCount = draft.items.length;
  const itemCount = draft.items.reduce(
    (n, i) => n + Number(i.quantity || 0),
    0,
  );
  return {lineCount, itemCount};
}
