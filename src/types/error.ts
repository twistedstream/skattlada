export class ValidationError extends Error {
  constructor(entity: string, field: string, message: string) {
    super(message);

    this.context = `${entity}.${field}`;
  }

  readonly context: string;
  readonly type: string = "validation";
}
