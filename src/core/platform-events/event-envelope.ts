export type AfxEventEnvelope<TPayload = unknown> = {
  eventId: string;
  eventKey: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  aggregate: { type: string; id: string };
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
  producer: string;
  payload: TPayload;
};

export function assertEventEnvelope(value: unknown): asserts value is AfxEventEnvelope {
  if (!value || typeof value !== 'object') throw new Error('Invalid event envelope');
  const event = value as Record<string, unknown>;
  const aggregate = event.aggregate as Record<string, unknown> | undefined;
  if (typeof event.eventId !== 'string' || typeof event.eventKey !== 'string' || typeof event.eventType !== 'string') throw new Error('Invalid event identity');
  if (!Number.isInteger(event.schemaVersion) || (event.schemaVersion as number) < 1) throw new Error('Invalid event schema version');
  if (typeof event.occurredAt !== 'string' || Number.isNaN(Date.parse(event.occurredAt))) throw new Error('Invalid event timestamp');
  if (!aggregate || typeof aggregate.type !== 'string' || typeof aggregate.id !== 'string') throw new Error('Invalid aggregate identity');
  if (typeof event.producer !== 'string' || event.producer.length === 0) throw new Error('Invalid event producer');
}
