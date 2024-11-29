import { StatusCodes, getReasonPhrase } from "http-status-codes";
import ShortUniqueId from "short-unique-id";

type ErrorHandlerData = {
  message: string;
  context?: string;
  statusCode: number;
  correlation_id?: string;
};

const { randomUUID } = new ShortUniqueId({ length: 25 });

export class ErrorWithData extends Error {
  constructor(message: string, data: any) {
    super(`${message} ${JSON.stringify(data)}`);

    this.data = data;
  }

  readonly data: any;
}

export class HttpError extends Error {
  constructor(statusCode: StatusCodes, message?: string, context?: string) {
    super(message || getReasonPhrase(statusCode));

    this.statusCode = statusCode;
    this.context = context;
  }

  readonly statusCode: StatusCodes;
  readonly context?: string;
}

export const NotFoundError = () => new HttpError(StatusCodes.NOT_FOUND);

export const BadRequestError = (message: string, context?: string) =>
  new HttpError(StatusCodes.BAD_REQUEST, message, context);

export const UnauthorizedError = (message?: string) =>
  new HttpError(StatusCodes.UNAUTHORIZED, message);

export const ForbiddenError = (message: string) =>
  new HttpError(StatusCodes.FORBIDDEN, message);

export function assertValue<T>(
  value: T | undefined | null,
  message?: string,
): T {
  if (value === undefined) {
    throw new Error(message || "Unexpected undefined value");
  }
  if (value === null) {
    throw new Error(message || "Unexpected null value");
  }

  return value;
}

export function buildErrorHandlerData(err: any): ErrorHandlerData {
  const statusCode: StatusCodes =
    err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  const message =
    statusCode < StatusCodes.INTERNAL_SERVER_ERROR
      ? <string>err.message
      : "Something unexpected happened";

  let correlation_id: string | undefined;
  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    correlation_id = randomUUID();
  }

  return {
    message,
    context: err.context,
    statusCode,
    correlation_id,
  };
}
