import { IRouter, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AuthenticatedRequest } from "../../types/express";
import { buildErrorHandlerData, NotFoundError } from "../../utils/error";
import { logger } from "../../utils/logger";

const errorHandler = (router: IRouter) => {
  // Catch unhandled requests and convert to 404
  router.use((_req: Request, _res: Response, next: NextFunction) => {
    next(NotFoundError());
  });

  // Handle all errors
  router.use(
    (
      err: any,
      _req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction
    ) => {
      const { message, context, statusCode, correlation_id } =
        buildErrorHandlerData(err);

      res.status(statusCode);

      if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        logger.error({ err, correlation_id });
      }

      return res.status(statusCode).json({
        status: "failed",
        errorMessage: message,
        errorContext: context,
        correlation_id,
      });
    }
  );
};

export default errorHandler;
