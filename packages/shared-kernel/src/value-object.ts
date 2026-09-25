export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  public equals(other: ValueObject<TProps>): boolean {
    if (this === other) return true;

    const left = Object.keys(this.props) as Array<keyof TProps>;
    const right = Object.keys(other.props) as Array<keyof TProps>;

    if (left.length !== right.length) return false;

    return left.every((key) => Object.is(this.props[key], other.props[key]));
  }

  public toPrimitives(): Readonly<TProps> {
    return this.props;
  }
}
