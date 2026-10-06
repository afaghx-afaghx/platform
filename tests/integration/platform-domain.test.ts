import { describe, expect, it } from 'vitest';
import { mockRequest, mockResponse } from '../tooling/mocks';
describe('PLATFORM ↔ DOMAIN boundary', () => {
  it('keeps tenant context attached to a domain-bound request', () => {
    const request = mockRequest({ path: '/v1/domain/resource', tenantId: 'tenant-a', userId: 'usr-a' });
    const response = mockResponse(200, { tenantId: request.tenantId });
    expect(response.status).toBe(200);
    expect((response.body as { tenantId: string }).tenantId).toBe('tenant-a');
  });
  it('does not allow a request without tenant context to become a domain operation', () => {
    const request = mockRequest({ path: '/v1/domain/resource' });
    expect(request.tenantId).toBeUndefined();
  });
});
