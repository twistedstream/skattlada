export class ValidationError extends Error {
  constructor(entity: string, field: string, fieldMessage: string) {
    super(`${entity}: ${field}: ${fieldMessage}`);

    this.entity = entity;
    this.field = field;
    this.fieldMessage = fieldMessage;
  }

  readonly entity: string;
  readonly field: string;
  readonly fieldMessage: string;
  readonly type: string = "validation";
}
