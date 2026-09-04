import { HttpSecurityMiddleware } from '../../src/core/security/http-security.middleware';

describe('HTTP security baseline', () => {
  it('adds a bounded request id and no-store cache headers', () => {
    const middleware = new HttpSecurityMiddleware();
    const headers = new Map<string, string>();
    const req = { headers: {} } as never;
    const res = { setHeader: (name: string, value: string) => headers.set(name, value) } as never;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('accepts a bounded caller request id for correlation', () => {
    const middleware = new HttpSecurityMiddleware();
    const headers = new Map<string, string>();
    const req = { headers: { 'x-request-id': 'trace-123' } } as never;
    const res = { setHeader: (name: string, value: string) => headers.set(name, value) } as never;
    middleware.use(req, res, jest.fn());
    expect(headers.get('X-Request-Id')).toBe('trace-123');
  });
});
