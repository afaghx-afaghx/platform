export interface IdGenerator<TId extends string = string> {
  generate(): TId;
}

export class UuidIdGenerator implements IdGenerator<string> {
  public generate(): string {
    return crypto.randomUUID();
  }
}
