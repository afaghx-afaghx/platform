export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export const Result = {
  ok<TValue>(value: TValue): Result<TValue, never> {
    return { ok: true, value };
  },
  fail<TError>(error: TError): Result<never, TError> {
    return { ok: false, error };
  },
} as const;
