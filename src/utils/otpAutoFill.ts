const OTP_REGEX = /\b(\d{6})\b/;

/** Pulls the first 6-digit code from SMS text, clipboard, or API hints. */
export function extractSixDigitOtp(text: string): string | null {
  const cleaned = text.replace(/\s/g, '');
  if (/^\d{6}$/.test(cleaned)) {
    return cleaned;
  }
  const match = cleaned.match(OTP_REGEX);
  return match?.[1] ?? null;
}
