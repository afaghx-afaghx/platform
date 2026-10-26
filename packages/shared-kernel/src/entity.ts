export abstract class Entity<TId> {
  protected constructor(public readonly id: TId) {}

  public equals(other: Entity<TId>): boolean {
    return this === other || this.id === other.id;
  }
}
