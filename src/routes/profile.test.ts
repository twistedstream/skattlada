import { Express, NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { ValidationError } from "../types/error";
import {
  testCredential1,
  testCredential2,
  testUser1,
} from "../utils/testing/data";
import {
  ViewRenderArgs,
  createTestExpressApp,
  verifyHtmlErrorResponse,
  verifyRedirectResponse,
} from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type ProfileTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const expressRouter = {
  get: sinon.fake(),
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const fetchCredentialsByUserIdStub = sinon.stub();
const modifyUserStub = sinon.stub();
const removeUserCredentialStub = sinon.stub();
const requiresAuthStub = sinon.stub();
const testCsrfToken = "CSRF_TOKEN";
const generateCsrfTokenFake = sinon.fake.returns(testCsrfToken);
const validateCsrfTokenStub = sinon.stub();

// helpers

function importModule(
  test: Tap.Test,
  { mockExpress = false, mockModules = false }: MockOptions = {}
) {
  const { default: router } = test.mock("./profile", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockModules && {
      "../services/user": {
        fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
        modifyUser: modifyUserStub,
        removeUserCredential: removeUserCredentialStub,
      },
      "../utils/auth": {
        requiresAuth: requiresAuthStub,
      },
      "../utils/csrf": {
        generateCsrfToken: generateCsrfTokenFake,
        validateCsrfToken: validateCsrfTokenStub,
      },
    }),
  });

  return router;
}

function createProfileTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: ProfileTestExpressAppOptions = {}
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

function performGetRequest(app: Express): SuperTest {
  return request(app).get("/");
}

function performPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/")
    .set("Content-Type", "application/x-www-form-urlencoded");
}

// tests

test("routes/profile", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();

    // give these stubs middleware behavior
    for (const stub of [requiresAuthStub, validateCsrfTokenStub]) {
      stub.callsFake(
        () => (_req: Request, _res: Response, next: NextFunction) => {
          next();
        }
      );
    }
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
      ["/"]
    );
    t.same(
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/"]
    );
  });

  t.test("GET /", async (t) => {
    const user1 = testUser1();
    const cred1 = testCredential1();
    const cred2 = testCredential2();
    let app: Express;
    let renderArgs: ViewRenderArgs;

    t.beforeEach(async () => {
      fetchCredentialsByUserIdStub.withArgs(user1.id).resolves([cred1, cred2]);
      const result = createProfileTestExpressApp(t, { withAuth: true });

      app = result.app;
      renderArgs = result.renderArgs;
    });

    t.test("requires authenticated session", async (t) => {
      await performGetRequest(app);

      t.ok(requiresAuthStub.called);
    });

    t.test("renders HTML with expected view state", async (t) => {
      const response = await performGetRequest(app);
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "profile");
      t.equal(options.title, "Profile");
      t.same(options.profile, {
        id: user1.id,
        created: user1.created,
        username: user1.username,
        displayName: user1.displayName,
        isAdmin: user1.isAdmin,
        activePasskey: {
          id: cred1.credentialID,
          type: cred1.credentialDeviceType,
          created: cred1.created.toISO(),
        },
        otherPasskeys: [
          {
            id: cred2.credentialID,
            type: cred2.credentialDeviceType,
            created: cred2.created.toISO(),
          },
        ],
      });
    });
  });

  t.test("POST /", async (t) => {
    t.test("validates CSRF token", async (t) => {
      const { app } = createProfileTestExpressApp(t, {
        withAuth: true,
      });

      await performPostRequest(app).send({});

      t.ok(validateCsrfTokenStub.called);
    });

    t.test("requires authenticated session", async (t) => {
      const { app } = createProfileTestExpressApp(t, {
        withAuth: true,
      });

      await performPostRequest(app).send({});

      t.ok(requiresAuthStub.called);
    });

    t.test("user update", async (t) => {
      t.test(
        "if a validation error occurs while updating profile, renders HTML with expected user error",
        async (t) => {
          modifyUserStub.rejects(
            new ValidationError("User", "displayName", "Sorry, can't do it")
          );

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
          });
          const user1 = testUser1();

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Bad Bob",
          });

          t.same(modifyUserStub.firstCall.firstArg, {
            id: user1.id,
            created: user1.created,
            username: user1.username,
            displayName: "Bad Bob",
            isAdmin: user1.isAdmin,
          });
          verifyHtmlErrorResponse(
            t,
            response,
            renderArgs,
            StatusCodes.BAD_REQUEST,
            "Error",
            "Sorry, can't do it"
          );
        }
      );

      t.test(
        "if an unknown error occurs while updating profile, renders HTML with expected server error",
        async (t) => {
          modifyUserStub.rejects(new Error("BOOM!"));

          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
            suppressErrorOutput: true,
          });
          const user1 = testUser1();

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Bad Bob",
          });

          t.same(modifyUserStub.firstCall.firstArg, {
            id: user1.id,
            created: user1.created,
            username: user1.username,
            displayName: "Bad Bob",
            isAdmin: user1.isAdmin,
          });
          verifyHtmlErrorResponse(
            t,
            response,
            renderArgs,
            StatusCodes.INTERNAL_SERVER_ERROR,
            "Error",
            "Something unexpected happened"
          );
        }
      );

      t.test(
        "if successful, updates profile and responds with expected redirect",
        async (t) => {
          modifyUserStub.resolves();

          const { app } = createProfileTestExpressApp(t, { withAuth: true });
          const user1 = testUser1();

          const response = await performPostRequest(app).send({
            action: "update_profile",
            display_name: "Good Bob",
          });

          t.same(modifyUserStub.firstCall.firstArg, {
            id: user1.id,
            created: user1.created,
            username: user1.username,
            displayName: "Good Bob",
            isAdmin: false,
          });
          verifyRedirectResponse(t, response, "/");
        }
      );
    });

    t.test("credential deletion", async (t) => {
      t.test(
        "if attempting to delete current credential, renders HTML with expected user error",
        async (t) => {
          const cred1 = testCredential1();
          const { app, renderArgs } = createProfileTestExpressApp(t, {
            withAuth: true,
          });

          const response = await performPostRequest(app).send({
            action: "delete_cred",
            cred_id: cred1.credentialID,
          });

          verifyHtmlErrorResponse(
            t,
            response,
            renderArgs,
            StatusCodes.BAD_REQUEST,
            "Error",
            "Cannot delete credential that was used to sign into the current session"
          );
        }
      );

      t.test(
        "if successful, updates profile and responds with expected redirect",
        async (t) => {
          const user1 = testUser1();
          const cred2 = testCredential2();
          removeUserCredentialStub.resolves();

          const { app } = createProfileTestExpressApp(t, { withAuth: true });

          const response = await performPostRequest(app).send({
            action: "delete_cred",
            cred_id: cred2.credentialID,
          });

          t.ok(removeUserCredentialStub.called);
          t.equal(removeUserCredentialStub.firstCall.args[0], user1.id);
          t.equal(
            removeUserCredentialStub.firstCall.args[1],
            cred2.credentialID
          );
          verifyRedirectResponse(t, response, "/");
        }
      );
    });

    t.test(
      "if unsupported profile operation, renders HTML with expected user error",
      async (t) => {
        const { app, renderArgs } = createProfileTestExpressApp(t, {
          withAuth: true,
        });

        const response = await performPostRequest(app).send({
          action: "burn_toast",
        });

        verifyHtmlErrorResponse(
          t,
          response,
          renderArgs,
          StatusCodes.BAD_REQUEST,
          "Error",
          "Unsupported profile action"
        );
      }
    );
  });
});
