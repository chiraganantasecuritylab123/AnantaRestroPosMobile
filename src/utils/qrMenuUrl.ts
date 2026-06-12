import {QR_MENU_BASE_URL} from '@env';

export function buildQrMenuUrl(
  uniqueQRCode: string | null | undefined,
): string | null {
  const code = uniqueQRCode?.trim();
  const base = QR_MENU_BASE_URL?.trim().replace(/\/$/, '');
  if (!code || !base) {
    return null;
  }
  return `${base}/${code}`;
}
