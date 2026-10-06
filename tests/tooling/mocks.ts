export type MockRequest = { method: string; path: string; tenantId?: string; userId?: string; permission?: string };
export type MockResponse = { status: number; body: unknown };

export function mockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return { method: 'GET', path: '/v1/test', ...overrides };
}

export function mockResponse(status = 200, body: unknown = {}): MockResponse {
  return { status, body };
}
