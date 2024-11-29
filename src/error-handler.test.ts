import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import request from "supertest";
import { test } from "tap";

import * as utilsError from "./utils/error";
import { BadRequestError, UnauthorizedError } from "./utils/error";
import { createTestExpressApp } from "./utils/testing/unit";

// test objects

const buildErrorHandlerDataStub = sinon.stub();
const logger = {
  error: sinon.fake(),
  debug: sinon.fake(),
};
const redirectToLoginStub = sinon
  .stub()
  .callsFake((_req: Request, res: Response) => {
    res.send("IGNORE");
  });

// tests

test("(root): error handler", async (t) => {
  t.beforeEach(() => {
    logger.error.resetHistory();
    buildErrorHandlerDataStub.resetHistory();
  });

  const { default: errorHandler } = t.mock("./error-handler", {
    "./utils/logger": { logger },
    "./utils/error": {
      ...utilsError,
      buildErrorHandlerData: buildErrorHandlerDataStub,
    },
    "./utils/auth": {
      redirectToLogin: redirectToLoginStub,
    },
  });

  t.test("builds error handler data using the thrown error", async (t) => {
    const error = new Error("BOOM!");

    buildErrorHandlerDataStub.returns({});

    const { app } = createTestExpressApp();
    app.get("/foo", (_req: Request, _res: Response) => {
      throw error;
    });
    errorHandler(app);

    await request(app).get("/foo");

    t.ok(buildErrorHandlerDataStub.called);
    t.equal(buildErrorHandlerDataStub.firstCall.firstArg, error);
  });

  t.test("401 errors", async (t) => {
    t.test("redirects to login page", async (t) => {
      let req: any = {};
      let res: any = {};

      buildErrorHandlerDataStub.returns({
        statusCode: StatusCodes.UNAUTHORIZED,
      });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        req = _req;
        res = _res;
        throw UnauthorizedError();
      });
      errorHandler(app);

      await request(app).get("/foo");

      t.ok(redirectToLoginStub.called);
      t.equal(redirectToLoginStub.firstCall.args[0], req);
      t.equal(redirectToLoginStub.firstCall.args[1], res);
    });
  });

  t.test("404 errors", async (t) => {
    t.test(
      "catches unhandled requests and converts them to 404 errors",
      async (t) => {
        buildErrorHandlerDataStub.returns({});

        const { app } = createTestExpressApp();
        errorHandler(app);

        await request(app).get("/foo");

        t.ok(buildErrorHandlerDataStub.called);
        t.equal(buildErrorHandlerDataStub.firstCall.firstArg.statusCode, 404);
      },
    );

    t.test("renders HTML with the expected view state", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: StatusCodes.NOT_FOUND });

      const { app, renderArgs } = createTestExpressApp();
      errorHandler(app);

      const response = await request(app).get("/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 404);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "404");
      t.equal(options.title, "Sorry, which page?");
      t.equal(options.message, "Not Found");
    });

    t.test("does not log the error", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: StatusCodes.NOT_FOUND });

      const { app } = createTestExpressApp();
      errorHandler(app);

      await request(app).get("/foo");

      t.notOk(logger.error.called);
    });
  });

  t.test("other 4** errors", async (t) => {
    t.test("renders HTML with the expected view state", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "Really bad request",
        context: "malarkey",
        statusCode: StatusCodes.BAD_REQUEST,
        correlation_id: "",
      });

      const { app, renderArgs } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw BadRequestError("");
      });
      errorHandler(app);

      const response = await request(app).get("/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 400);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "Really bad request");
      t.equal(options.context, "malarkey");
      t.equal(options.error_status, 400);
      t.notOk(options.correlation_id);
    });

    t.test("does not log the error", async (t) => {
      buildErrorHandlerDataStub.returns({ statusCode: StatusCodes.NOT_FOUND });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw BadRequestError("");
      });
      errorHandler(app);

      await request(app).get("/foo");

      t.notOk(logger.error.called);
    });
  });

  t.test("5** errors", async (t) => {
    t.test("renders HTML with the expected view state", async (t) => {
      buildErrorHandlerDataStub.returns({
        message: "What'd you do?",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        correlation_id: "ERROR_ID",
      });

      const { app, renderArgs } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw new Error("BOOM!");
      });
      errorHandler(app);

      const response = await request(app).get("/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, 500);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "error");
      t.equal(options.title, "Error");
      t.equal(options.message, "What'd you do?");
      t.equal(options.error_status, 500);
      t.equal(options.correlation_id, "ERROR_ID");
    });

    t.test("logs the error", async (t) => {
      const error = new Error("BOOM!");
      buildErrorHandlerDataStub.returns({
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        correlation_id: "ERROR_ID",
      });

      const { app } = createTestExpressApp();
      app.get("/foo", (_req: Request, _res: Response) => {
        throw error;
      });
      errorHandler(app);

      await request(app).get("/foo");

      t.ok(logger.error.called);
      t.equal(logger.error.firstCall.firstArg.err, error);
      t.equal(logger.error.firstCall.firstArg.correlation_id, "ERROR_ID");
    });
  });
});
