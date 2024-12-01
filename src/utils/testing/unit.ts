import express, { Express, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import path from "path";
import querystring from "querystring";
import sinon from "sinon";
import { Response as SupertestResponse } from "supertest";
import { Test } from "tap";

import { Authenticator, User } from "../../types/entity";
import { AuthenticatedRequest } from "../../types/express";

type AuthSetup = {
  originalUrl: string;
  activeUser: User;
  activeCredential: Authenticator;
};
type MiddlewareSetup = (app: Express) => void;
type ErrorHandlerSetup = {
  test: Test;
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
      /.*/,
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
    const { default: errorHandler } = errorHandlerSetup.test.mockRequire(
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
  t: Test,
  req: Request,
  expectations: ExpressRequestExpectations,
) {
  t.ok(req, "req exists");
  t.equal(req.url, expectations.url, "expected req.url");
  t.equal(req.method, expectations.method, "expected req.method");
  // FUTURE: additional verifications
}

/**
 * Verifies the state of the provided Express.Response object
 */
export function verifyResponse(t: Test, res: Response) {
  t.ok(res, "res exists");
  t.ok(res.render, "res.render exists");
  t.ok(res.send, "res.send exists");
  t.ok(res.json, "res.json exists");
  // FUTURE: additional verifications
}

/**
 * Verifies that the provided SuperTest.Response object appears to be a redirect
 * to the specified URL
 */
export function verifyRedirectResponse(
  t: Test,
  response: SupertestResponse,
  url: string,
) {
  t.equal(
    response.status,
    StatusCodes.MOVED_TEMPORARILY,
    "expected HTTP status",
  );
  t.equal(response.headers.location, url, "expected HTTP location");
}

/**
 * Verifies that the provided SuperTest.Response object appears to be a redirect
 * to the login endpoint
 */
export function verifyAuthenticationRequiredResponse(
  t: Test,
  response: SupertestResponse,
  return_to: string = "/",
) {
  verifyRedirectResponse(
    t,
    response,
    "/login?" + querystring.encode({ return_to }),
  );
}

export function verifyHtmlErrorResponse(
  t: Test,
  response: SupertestResponse,
  renderArgs: ViewRenderArgs,
  statusCode: StatusCodes,
  title: string,
  errorMessage: string | RegExp,
) {
  const { viewName, options } = renderArgs;

  t.equal(response.status, statusCode, "expected HTTP status");
  t.match(
    response.headers["content-type"],
    "text/html",
    "expected HTTP content type",
  );
  t.equal(viewName, "error", "expected view name");
  t.equal(options.title, title, "expected title");
  t.match(options.message, errorMessage, "expected error message");
}

export function verifyFido2ErrorResponse(
  t: Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
  errorMessage: string | RegExp,
  errorContext?: string,
) {
  t.equal(response.statusCode, statusCode, "expected HTTP status");
  t.match(
    response.headers["content-type"],
    "application/json",
    "expected HTTP content type",
  );
  const json = JSON.parse(response.text);
  t.equal(json.status, "failed", "expected FIDO status");
  t.match(json.errorMessage, errorMessage, "expected FIDO error message");
  if (errorContext) {
    t.match(json.errorContext, errorContext, "expected FIDO error context");
  }

  delete json.status;
  delete json.errorMessage;
  return json;
}

export function verifyUserErrorFido2ServerResponse(
  t: Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
  errorMessage: string | RegExp,
  errorContext?: string,
) {
  t.ok(statusCode >= 400 && statusCode < 500, "HTTP status is user error");

  const json = verifyFido2ErrorResponse(
    t,
    response,
    statusCode,
    errorMessage,
    errorContext,
  );

  // assert no correlation ID
  t.equal(json.correlation_id, undefined, "expected undefined correlation_id");
}

export function verifyServerErrorFido2ServerResponse(
  t: Test,
  response: SupertestResponse,
  statusCode: StatusCodes,
) {
  t.ok(statusCode >= 500, "HTTP status is server error");

  const json = verifyFido2ErrorResponse(
    t,
    response,
    statusCode,
    "Something unexpected happened",
  );

  // assert correlation ID
  t.ok(json.correlation_id, "correlation_id exists");
  t.ok(json.correlation_id.length > 0, "correlation_id is non-empty");
}

export function verifyFido2SuccessResponse(
  t: Test,
  response: SupertestResponse,
  expectedData: any,
) {
  t.equal(response.statusCode, StatusCodes.OK, "expected HTTP status");
  t.match(
    response.headers["content-type"],
    "application/json",
    "expected HTTP content type",
  );
  const json = JSON.parse(response.text);
  t.equal(json.status, "ok", "expected FIDO status");
  t.notOk(json.errorMessage, "expected no FIDO error message");
  t.match(json, expectedData, "expected FIDO data");
}

/**
 * Waits for the next Node.js event loop
 */
export async function waitForNextLoop() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
