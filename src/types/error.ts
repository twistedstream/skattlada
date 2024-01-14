export class ValidationError extends Error {
  constructor(entity: string, field: string, message: string) {
    super(message);

    this.entity = entity;
    this.field = field;
  }

  readonly entity: string;
  readonly field: string;
  readonly type: string = "validation";
}
