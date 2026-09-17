import crypto from 'node:crypto';

export const DOMAIN_DEFINITIONS = Object.freeze({
  product: { table: 'domain_product', required: ['name'], states: ['draft', 'active', 'archived'] },
  commerce: { table: 'domain_commerce', required: ['name'], states: ['draft', 'active', 'closed'] },
  order: { table: 'domain_order', required: ['customerId'], states: ['pending', 'confirmed', 'fulfilled', 'cancelled'] },
  factory: { table: 'domain_factory', required: ['name'], states: ['draft', 'active', 'suspended'] },
  supplier: { table: 'domain_supplier', required: ['name'], states: ['draft', 'active', 'suspended'] },
  service: { table: 'domain_service', required: ['name'], states: ['draft', 'active', 'archived'] },
  partner: { table: 'domain_partner', required: ['name'], states: ['prospect', 'active', 'suspended', 'ended'] },
  marketing: { table: 'domain_marketing', required: ['name'], states: ['draft', 'scheduled', 'active', 'completed', 'cancelled'] },
  advertising: { table: 'domain_advertising', required: ['name'], states: ['draft', 'scheduled', 'active', 'completed', 'cancelled'] },
  logistics: { table: 'domain_logistics', required: ['orderId'], states: ['planned', 'in_transit', 'delivered', 'cancelled'] },
  payment: { table: 'domain_payment', required: ['amount', 'currency'], states: ['pending', 'authorized', 'captured', 'refunded', 'failed'] }
});

const transitions = Object.freeze({
  product: { draft: ['active', 'archived'], active: ['archived'], archived: [] },
  commerce: { draft: ['active', 'closed'], active: ['closed'], closed: [] },
  order: { pending: ['confirmed', 'cancelled'], confirmed: ['fulfilled', 'cancelled'], fulfilled: [], cancelled: [] },
  factory: { draft: ['active', 'suspended'], active: ['suspended'], suspended: ['active'] },
  supplier: { draft: ['active', 'suspended'], active: ['suspended'], suspended: ['active'] },
  service: { draft: ['active', 'archived'], active: ['archived'], archived: [] },
  partner: { prospect: ['active', 'ended'], active: ['suspended', 'ended'], suspended: ['active', 'ended'], ended: [] },
  marketing: { draft: ['scheduled', 'cancelled'], scheduled: ['active', 'cancelled'], active: ['completed', 'cancelled'], completed: [], cancelled: [] },
  advertising: { draft: ['scheduled', 'cancelled'], scheduled: ['active', 'cancelled'], active: ['completed', 'cancelled'], completed: [], cancelled: [] },
  logistics: { planned: ['in_transit', 'cancelled'], in_transit: ['delivered', 'cancelled'], delivered: [], cancelled: [] },
  payment: { pending: ['authorized', 'failed'], authorized: ['captured', 'failed'], captured: ['refunded'], refunded: [], failed: [] }
});

export function assertDomain(domain) {
  if (!DOMAIN_DEFINITIONS[domain]) throw new Error(`unknown_domain:${domain}`);
  return DOMAIN_DEFINITIONS[domain];
}

function validatePayload(domain, payload) {
  const definition = assertDomain(domain);
  for (const field of definition.required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new Error(`required_field:${domain}:${field}`);
    }
  }
  if (domain === 'payment' && (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) <= 0)) {
    throw new Error('invalid_payment_amount');
  }
  if (domain === 'payment' && !/^[A-Z]{3}$/.test(String(payload.currency))) {
    throw new Error('invalid_payment_currency');
  }
}

export function createDomainRecord(domain, payload, now = new Date()) {
  const definition = assertDomain(domain);
  validatePayload(domain, payload);
  const state = payload.state ?? definition.states[0];
  if (!definition.states.includes(state)) throw new Error(`invalid_state:${domain}:${state}`);
  return {
    id: payload.id ?? crypto.randomUUID(),
    domain,
    state,
    data: { ...payload, state: undefined },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function transitionDomainRecord(record, nextState, now = new Date()) {
  assertDomain(record.domain);
  const allowed = transitions[record.domain]?.[record.state] ?? [];
  if (!allowed.includes(nextState)) {
    throw new Error(`invalid_transition:${record.domain}:${record.state}->${nextState}`);
  }
  return { ...record, state: nextState, updatedAt: now.toISOString() };
}

export class DomainRepository {
  constructor(adapter) {
    if (!adapter || typeof adapter.insert !== 'function' || typeof adapter.findById !== 'function' || typeof adapter.updateState !== 'function') {
      throw new Error('invalid_domain_repository');
    }
    this.adapter = adapter;
  }

  async create(domain, payload) {
    const record = createDomainRecord(domain, payload);
    await this.adapter.insert(assertDomain(domain).table, record);
    return record;
  }

  async get(domain, id) {
    assertDomain(domain);
    return this.adapter.findById(assertDomain(domain).table, id);
  }

  async transition(domain, id, nextState) {
    const record = await this.get(domain, id);
    if (!record) throw new Error('not_found');
    const next = transitionDomainRecord(record, nextState);
    await this.adapter.updateState(assertDomain(domain).table, id, next.state, next.updatedAt);
    return next;
  }
}
