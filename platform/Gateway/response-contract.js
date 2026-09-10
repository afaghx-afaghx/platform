const STATUS_CODES = new Set([
  200, 201, 202, 204,
  400, 401, 403, 404, 409, 413, 422, 429,
  500, 502, 503, 504,
]);

function normalizeCode(code) {
  const value = String(code ?? 'internal_error').trim();
  if (!/^[a-z][a-z0-9_.-]{1,63}$/.test(value)) throw new TypeError('invalid_error_code');
  return value;
}

export function okResponse({ status = 200, data = undefined, requestId, meta = undefined } = {}) {
  if (!STATUS_CODES.has(status) || status < 200 || status >= 300) throw new TypeError('invalid_success_status');
  return Object.freeze({
    ok: true,
    status,
    requestId: requestId ? String(requestId) : undefined,
    data,
    meta,
  });
}

export function errorResponse({ status = 500, code, message, requestId, details = undefined, retryable = false } = {}) {
  if (!STATUS_CODES.has(status) || status < 400) throw new TypeError('invalid_error_status');
  if (typeof message !== 'string' || message.length === 0 || message.length > 512) throw new TypeError('invalid_error_message');
  return Object.freeze({
    ok: false,
    status,
    requestId: requestId ? String(requestId) : undefined,
    error: Object.freeze({
      code: normalizeCode(code),
      message,
      details,
      retryable: Boolean(retryable),
    }),
  });
}
