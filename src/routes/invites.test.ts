import { Express, NextFunction, Request, Response } from "express";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import {
  testCredential1,
  testInvite1,
  testUser1,
  testUser2,
} from "../utils/testing/data";
import {
  ViewRenderArgs,
  createTestExpressApp,
  verifyHtmlErrorResponse,
  verifyRedirectResponse,
  verifyRequest,
  verifyResponse,
} from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type InvitesTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const expressRouter = {
  get: sinon.fake(),
  post: sinon.fake(),
};
const logger = {
  info: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const claimInviteStub = sinon.stub();
const authorizeRegistrationStub = sinon.stub();
const clearRegisterableFake = sinon.fake();
const getRegisterableStub = sinon.stub();
const redirectToRegisterStub = sinon.stub();
const testInvite = testInvite1(testUser2());
const ensureInviteFake = sinon.fake.returns(testInvite);
const testCsrfToken = "CSRF_TOKEN";
const generateCsrfTokenFake = sinon.fake.returns(testCsrfToken);
const validateCsrfTokenStub = sinon.stub();

// helpers

function importModule(
  test: Tap.Test,
  { mockExpress = false, mockModules = false }: MockOptions = {},
) {
  const { default: router } = test.mock("./invites", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockModules && {
      "../utils/logger": { logger },
      "../services/invite": {
        claimInvite: claimInviteStub,
      },
      "../utils/auth": {
        authorizeRegistration: authorizeRegistrationStub,
        clearRegisterable: clearRegisterableFake,
        getRegisterable: getRegisterableStub,
        redirectToRegister: redirectToRegisterStub,
      },
      "../utils/invite": {
        ensureInvite: ensureInviteFake,
      },
      "../utils/csrf": {
        generateCsrfToken: generateCsrfTokenFake,
        validateCsrfToken: validateCsrfTokenStub,
      },
    }),
  });

  return router;
}

function createInvitesTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: InvitesTestExpressAppOptions = {},
) {
  const router = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: "/",
          activeUser: testUser1(),
          activeCredential: testCredential1(),
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
      suppressErrorOutput,
    },
  });
}

function performGetRequest(app: Express, inviteId: string): SuperTest {
  return request(app).get(`/${inviteId}`);
}

function performPostRequest(app: Express, inviteId: string): SuperTest {
  return request(app)
    .post(`/${inviteId}`)
    .set("Content-Type", "application/x-www-form-urlencoded");
}

// tests

test("routes/invites", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();

    validateCsrfTokenStub.callsFake(
      () => (_req: Request, _res: Response, next: NextFunction) => {
        next();
      },
    );
  });

  t.test("is a Router instance", async (t) => {
    const profile = importModule(t, { mockExpress: true });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(profile, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, { mockExpress: true });

    t.same(
      expressRouter.get.getCalls().map((c) => c.firstArg),
      ["/:invite_id"],
    );
    t.same(
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/:invite_id"],
    );
  });

  t.test("GET /:invite_id", async (t) => {
    t.test("ensures invite", async (t) => {
      const { app } = createInvitesTestExpressApp(t);

      await performGetRequest(app, testInvite.id);

      t.ok(ensureInviteFake.called);
      verifyRequest(t, ensureInviteFake.firstCall.firstArg, {
        url: `/${testInvite.id}`,
        method: "GET",
      });
    });

    t.test("when user is authenticated", async (t) => {
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createInvitesTestExpressApp(t, { withAuth: true });
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("gets registerable state", async (t) => {
        await performGetRequest(app, testInvite.id);

        t.ok(getRegisterableStub.called);
        verifyRequest(t, getRegisterableStub.firstCall.firstArg, {
          url: `/${testInvite.id}`,
          method: "GET",
        });
      });

      t.test(
        "if registerable state is missing, renders HTML with expected user error",
        async (t) => {
          const response = await performGetRequest(app, testInvite.id);

          verifyHtmlErrorResponse(
            t,
            response,
            renderArgs,
            StatusCodes.FORBIDDEN,
            "Error",
            "You can't accept an invite to register when you're already signed in",
          );
        },
      );

      t.test("when registerable state exists", async (t) => {
        t.beforeEach(async () => {
          getRegisterableStub.returns({});
        });

        t.test("clears registerable state", async (t) => {
          await performGetRequest(app, testInvite.id);

          t.ok(clearRegisterableFake.called);
          verifyRequest(t, clearRegisterableFake.firstCall.firstArg, {
            url: `/${testInvite.id}`,
            method: "GET",
          });
        });

        t.test("claims the invite for the current user", async (t) => {
          await performGetRequest(app, testInvite.id);

          t.ok(claimInviteStub.called);
          t.equal(claimInviteStub.firstCall.args[0], testInvite.id);
          t.same(claimInviteStub.firstCall.args[1], testUser1());
        });

        t.test("logs the claimed invite", async (t) => {
          const claimedInvite = {};
          claimInviteStub.resolves(claimedInvite);

          await performGetRequest(app, testInvite.id);

          t.ok(logger.info.called);
          t.equal(logger.info.firstCall.args[0], claimedInvite);
          t.equal(logger.info.firstCall.args[1], "New user has claimed invite");
        });

        t.test("redirects to the shares page", async (t) => {
          const response = await performGetRequest(app, testInvite.id);

          verifyRedirectResponse(t, response, "/shares");
        });
      });
    });

    t.test("when user is not authenticated", async (t) => {
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createInvitesTestExpressApp(t);
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("generates a new CSRF token", async (t) => {
        await performGetRequest(app, testInvite.id);

        t.ok(generateCsrfTokenFake.called);
        verifyRequest(t, generateCsrfTokenFake.firstCall.args[0], {
          method: "GET",
          url: `/${testInvite.id}`,
        });
        verifyResponse(t, generateCsrfTokenFake.firstCall.args[1]);
        t.equal(generateCsrfTokenFake.firstCall.args[2], true);
      });

      t.test("renders invite accept form", async (t) => {
        const response = await performGetRequest(app, testInvite.id);

        const { viewName, options } = renderArgs;
        t.equal(response.status, StatusCodes.OK);
        t.match(response.headers["content-type"], "text/html");
        t.equal(viewName, "accept_invite");
        t.equal(options.csrf_token, testCsrfToken);
        t.equal(options.title, "You've been invited");
        t.same(options.invite, testInvite);
      });
    });
  });

  t.test("POST /:invite_id", async (t) => {
    t.test("validates CSRF token", async (t) => {
      const { app } = createInvitesTestExpressApp(t);

      await performPostRequest(app, testInvite.id);

      t.ok(validateCsrfTokenStub.called);
    });

    t.test("ensures invite", async (t) => {
      const { app } = createInvitesTestExpressApp(t);

      await performPostRequest(app, testInvite.id);

      t.ok(ensureInviteFake.called);
      verifyRequest(t, ensureInviteFake.firstCall.firstArg, {
        url: `/${testInvite.id}`,
        method: "POST",
      });
    });

    t.test("when user is authenticated", async (t) => {
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createInvitesTestExpressApp(t, { withAuth: true });
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("renders HTML with expected user error", async (t) => {
        const response = await performPostRequest(app, testInvite.id);

        verifyHtmlErrorResponse(
          t,
          response,
          renderArgs,
          StatusCodes.FORBIDDEN,
          "Error",
          "This endpoint does not support an existing user session",
        );
      });
    });

    t.test("when user is not authenticated", async (t) => {
      let app: Express;
      let renderArgs: ViewRenderArgs;

      t.beforeEach(async () => {
        const result = createInvitesTestExpressApp(t, {
          suppressErrorOutput: false,
        });
        app = result.app;
        renderArgs = result.renderArgs;
      });

      t.test("when action is 'accept'", async (t) => {
        t.beforeEach(async () => {
          redirectToRegisterStub.callsFake((_req: Request, res: Response) => {
            res.send("ignored");
          });
        });

        t.test("authorizes registration", async (t) => {
          await performPostRequest(app, testInvite.id).send({
            action: "accept",
          });

          t.ok(authorizeRegistrationStub.called);
          verifyRequest(t, authorizeRegistrationStub.firstCall.args[0], {
            url: `/${testInvite.id}`,
            method: "POST",
          });
          t.equal(authorizeRegistrationStub.firstCall.args[1], testInvite);
        });

        t.test("redirects to register page", async (t) => {
          const response = await performPostRequest(app, testInvite.id).send({
            action: "accept",
          });

          t.ok(redirectToRegisterStub.called);
          verifyRequest(t, redirectToRegisterStub.firstCall.args[0], {
            url: `/${testInvite.id}`,
            method: "POST",
          });
          verifyResponse(t, redirectToRegisterStub.firstCall.args[1]);
          t.equal(redirectToRegisterStub.firstCall.args[2], true);
        });
      });

      t.test("otherwise, renders HTML with expected user error", async (t) => {
        const response = await performPostRequest(app, testInvite.id).send({
          action: "foo",
        });

        verifyHtmlErrorResponse(
          t,
          response,
          renderArgs,
          StatusCodes.BAD_REQUEST,
          "Error",
          "Unsupported invite response operation",
        );
      });
    });
  });
});
