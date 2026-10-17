export interface DomainEventMetadata {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly eventVersion: number;
  readonly correlationId: string;
  readonly causationId?: string;
}

export interface DomainEvent<TType extends string, TPayload extends object> {
  readonly type: TType;
  readonly metadata: DomainEventMetadata;
  readonly payload: Readonly<TPayload>;
}

export function createDomainEvent<TType extends string, TPayload extends object>(
  type: TType,
  metadata: DomainEventMetadata,
  payload: TPayload,
): DomainEvent<TType, TPayload> {
  return Object.freeze({
    type,
    metadata: Object.freeze({ ...metadata }),
    payload: Object.freeze({ ...payload }),
  });
}
