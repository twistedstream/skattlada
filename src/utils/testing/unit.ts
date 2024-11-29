import express, { Express, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import path from "path";
import querystring from "querystring";
import sinon from "sinon";
import { Response as SupertestResponse } from "supertest";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { Authenticator, User } from "../../types/entity";
import { AuthenticatedRequest } from "../../types/express";

type AuthSetup = {
  originalUrl: string;
  activeUser: User;
  activeCredential: Authenticator;
};
type MiddlewareSetup = (app: Express) => void;
type ErrorHandlerSetup = {
  test: Tap.Test;
  modulePath: string;
  suppressErrorOutput?: boolean;
};
type TestExpressAppOptions = {
  authSetup?: AuthSetup;
  middlewareSetup?: MiddlewareSetup;
  errorHandlerSetup?: ErrorHandlerSetup;
};
export type ViewRenderArgs = { viewName?: string; options?: any };
type ExpressRequestExpectations = { url: string; method: "GET" | "POST" };

// helper functions

/**
 * Creates an Express object that can be used for testing
 */
export function createTestExpressApp({
  authSetup,
  middlewareSetup,
  errorHandlerSetup,
}: TestExpressAppOptions = {}): {
  app: Express;
  renderArgs: ViewRenderArgs;
} {
  const app = express();
  const renderArgs: ViewRenderArgs = {};

  app.set("view engine", "handlebars");
  app.engine("handlebars", (viewPath: string, options: any, cb) => {
    renderArgs.viewName = path.parse(viewPath).name;
    renderArgs.options = options;

    cb(null, "ignored");
  });

  if (authSetup) {
    app.all(
      "*",
      (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
        req.originalUrl = authSetup.originalUrl;
        req.user = authSetup.activeUser;
        req.credential = authSetup.activeCredential;

        next();
      },
    );
  }

  if (middlewareSetup) {
    middlewareSetup(app);
  }

  if (errorHandlerSetup) {
    const logger = {
      info: sinon.fake(),
      debug: sinon.fake(),
      error: errorHandlerSetup.suppressErrorOutput
        ? sinon.fake()
        : console.error,
    };

    // include error handler behavior, but fake the logging
    const { default: errorHandler } = errorHandlerSetup.test.mock(
      errorHandlerSetup.modulePath,
      {
        "../../utils/logger": { logger },
      },
    );
    errorHandler(app);
  }

  return { app, renderArgs };
}

/**
 * Verifies the state of the provided Express.Request object
 */
export function verifyRequest(
  test: Tap.Test,
  req: Request,
  expectations: ExpressRequestExpectations,
) {
  test.ok(req, "req exists");
  test.equal(req.url, expectations.url, "expected req.url");
  test.equal(req.method, expectations.method, "expected req.method");
  // FUTURE: additional verifications
}

/**
 * Verifies the state of the provided Express.Response object
 */
export function verifyResponse(test: Tap.Test, res: Response) {
  test.ok(res, "res exists");
  test.ok(res.render, "res.render exists");
  test.ok(res.send, "res.send exists");
  test.ok(res.json, "res.json exists");
  // FUTURE: additional verifications
}

/**
 * Verifies that the provided SuperTest.Response object appears to be a redirect
 * to the specified URL
 */
export function verifyRedirectResponse(
  test: Tap.Test,
  response: SupertestResponse,
  url: string,
) {
  test.equal(
    response.status,
    StatusCodes.MOVED_TEMPORARILY,
    "expected HTTP status",
  );
  test.equal(response.headers.location, url, "expected HTTP location");
}

/**
 * Verifies that the provided SuperTest.Response object appears to be a redirect
 * to the login endpoint
 */
export function verifyAuthenticationRequiredResponse(
  test: Tap.Test,
  response: SupertestResponse,
  return_to: string = "/",
) {
  verifyRedirectResponse(
    test,
    response,
    "/login?" + querystring.encode({ return_to }),
  );
}

export function verifyHtmlErrorResponse(
  test: Tap.Test,
  response: SupertestResponse,
  renderArgs: ViewRenderArgs,
  statusCode: StatusCodes,
  title: string,
  errorMessage: string | RegExp,
) {
  const { viewName, options } = renderArgs;

  test.equal(response.status, statusCode, "expected HTTP status");
  test.match(
    response.headers["content-type"],
    "text/html",
    "expected HTTP content type",
  );
  test.equal(viewName, "error", "expected view name");
  test.equal(options.title, title, "expected title");
  test.match(options.message, errorMessage, "expected error message");
}

export function verifyFido2ErrorResponse(
  test: Tap.Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
  errorMessage: string | RegExp,
  errorContext?: string,
) {
  test.equal(response.statusCode, statusCode, "expected HTTP status");
  test.match(
    response.headers["content-type"],
    "application/json",
    "expected HTTP content type",
  );
  const json = JSON.parse(response.text);
  test.equal(json.status, "failed", "expected FIDO status");
  test.match(json.errorMessage, errorMessage, "expected FIDO error message");
  if (errorContext) {
    test.match(json.errorContext, errorContext, "expected FIDO error context");
  }

  delete json.status;
  delete json.errorMessage;
  return json;
}

export function verifyUserErrorFido2ServerResponse(
  test: Tap.Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
  errorMessage: string | RegExp,
  errorContext?: string,
) {
  test.ok(statusCode >= 400 && statusCode < 500, "HTTP status is user error");

  const json = verifyFido2ErrorResponse(
    test,
    response,
    statusCode,
    errorMessage,
    errorContext,
  );

  // assert no correlation ID
  test.equal(
    json.correlation_id,
    undefined,
    "expected undefined correlation_id",
  );
}

export function verifyServerErrorFido2ServerResponse(
  test: Tap.Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
) {
  test.ok(statusCode >= 500, "HTTP status is server error");

  const json = verifyFido2ErrorResponse(
    test,
    response,
    statusCode,
    "Something unexpected happened",
  );

  // assert correlation ID
  test.ok(json.correlation_id, "correlation_id exists");
  test.ok(json.correlation_id.length > 0, "correlation_id is non-empty");
}

export function verifyFido2SuccessResponse(
  test: Tap.Test,
  response: SupertestResponse,
  expectedData: any,
) {
  test.equal(response.statusCode, StatusCodes.OK, "expected HTTP status");
  test.match(
    response.headers["content-type"],
    "application/json",
    "expected HTTP content type",
  );
  const json = JSON.parse(response.text);
  test.equal(json.status, "ok", "expected FIDO status");
  test.notOk(json.errorMessage, "expected no FIDO error message");
  test.match(json, expectedData, "expected FIDO data");
}

/**
 * Waits for the next Node.js event loop
 */
export async function waitForNextLoop() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
