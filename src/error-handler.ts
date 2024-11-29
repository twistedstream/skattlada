import { IRouter, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AuthenticatedRequest } from "./types/express";
import { redirectToLogin } from "./utils/auth";
import { buildErrorHandlerData, NotFoundError } from "./utils/error";
import { logger } from "./utils/logger";

const errorHandler = (router: IRouter) => {
  // Catch unhandled requests and convert to 404
  router.use((_req: Request, _res: Response, next: NextFunction) => {
    next(NotFoundError());
  });

  // Handle all errors
  router.use(
    (
      err: any,
      req: AuthenticatedRequest,
      res: Response,
      _next: NextFunction,
    ) => {
      const { message, context, statusCode, correlation_id } =
        buildErrorHandlerData(err);

      if (statusCode === StatusCodes.UNAUTHORIZED) {
        logger.debug("error-handler: Redirecting UNAUTHORIZED to login page");
        return redirectToLogin(req, res);
      }

      res.status(statusCode);

      if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        logger.error({ err, correlation_id });
      }

      if (statusCode === StatusCodes.NOT_FOUND) {
        return res.render("404", {
          title: "Sorry, which page?",
          message: err.message,
        });
      }

      res.render("error", {
        title: "Error",
        message,
        context,
        error_status: statusCode,
        correlation_id,
      });
    },
  );
};

export default errorHandler;
