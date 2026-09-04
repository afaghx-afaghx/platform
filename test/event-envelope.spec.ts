import { assertEventEnvelope } from '../src/core/platform-events/event-envelope';

describe('AfxEventEnvelope', () => {
  it('accepts a valid versioned envelope', () => {
    expect(() => assertEventEnvelope({ eventId: 'e1', eventKey: 'identity.created:e1', eventType: 'identity.created', schemaVersion: 1, occurredAt: new Date().toISOString(), aggregate: { type: 'Identity', id: 'i1' }, producer: 'afx-core', payload: {} })).not.toThrow();
  });

  it('rejects missing identity and invalid version', () => {
    expect(() => assertEventEnvelope({ schemaVersion: 0 })).toThrow();
  });
});
