export type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  code?: string;
  attemptsRemaining?: number;
};

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    value != null &&
    typeof value === 'object' &&
    ('message' in value || 'success' in value || 'code' in value)
  );
}

export function formatOtpVerifyError(
  payload: unknown,
  fallback = 'Invalid OTP',
): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }
  if (!isApiErrorPayload(payload)) {
    return fallback;
  }
  const message = payload.message?.trim() || fallback;
  if (typeof payload.attemptsRemaining !== 'number') {
    return message;
  }
  if (payload.attemptsRemaining <= 0) {
    return `${message}. No attempts remaining.`;
  }
  const label = payload.attemptsRemaining === 1 ? 'attempt' : 'attempts';
  return `${message}. ${payload.attemptsRemaining} ${label} remaining.`;
}

export function extractRtkQueryError(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  if ('data' in error) {
    const data = (error as {data: unknown}).data;
    if (isApiErrorPayload(data)) {
      return formatOtpVerifyError(data, fallback);
    }
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    if (data && typeof data === 'object' && 'data' in data) {
      return formatOtpVerifyError(
        (data as {data: unknown}).data,
        fallback,
      );
    }
  }

  if (
    'message' in error &&
    typeof (error as {message: unknown}).message === 'string'
  ) {
    return (error as {message: string}).message;
  }

  if (
    'error' in error &&
    typeof (error as {error: unknown}).error === 'string'
  ) {
    return (error as {error: string}).error;
  }

  return fallback;
}

/** Treat structured client errors as normal response bodies (not fetch errors). */
export function isStructuredClientError(
  status: number,
  body: unknown,
): boolean {
  return (
    status >= 400 &&
    status < 500 &&
    isApiErrorPayload(body) &&
    body.success === false
  );
}
