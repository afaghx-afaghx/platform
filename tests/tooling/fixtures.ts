export function tenantFixture(id = 'tenant-test') {
  return { id, status: 'active' as const };
}

export function userFixture(id = 'usr-test') {
  return { id, status: 'active' as const, email: 'user-' + id + '@example.test' };
}

export function membershipFixture(userId = 'usr-test', tenantId = 'tenant-test', roles: string[] = []) {
  return { userId, tenantId, roles: [...new Set(roles)], status: 'active' as const };
}
