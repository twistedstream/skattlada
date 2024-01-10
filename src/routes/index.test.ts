import sinon from "sinon";
import request from "supertest";
import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import { createTestExpressApp, verifyRequest } from "../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockChildRoutes?: boolean;
  mockModules?: boolean;
};

// test objects

const expressRouter = {
  use: sinon.fake(),
  get: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const capturePreAuthStateFake = sinon.fake();
const signOutFake = sinon.fake();
const getRegisterableStub = sinon.stub();
const fido2Route = sinon.fake();
const profileRoute = sinon.fake();
const invitesRoute = sinon.fake();
const sharesRoute = sinon.fake();

// helpers

function importModule(
  test: Tap.Test,
  {
    mockExpress = false,
    mockChildRoutes = false,
    mockModules = false,
  }: MockOptions = {}
) {
  const { default: router } = test.mock("./index", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockChildRoutes && {
      "./fido2": fido2Route,
      "./profile": profileRoute,
      "./invites": invitesRoute,
      "./shares": sharesRoute,
    }),
    ...(mockModules && {
      "../utils/auth": {
        capturePreAuthState: capturePreAuthStateFake,
        signOut: signOutFake,
        getRegisterable: getRegisterableStub,
      },
    }),
  });

  return router;
}

function createIndexTestExpressApp(test: Tap.Test) {
  const router = importModule(test, {
    mockModules: true,
    mockChildRoutes: true,
  });

  return createTestExpressApp({
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../error-handler",
    },
  });
}

// tests

test("routes/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const index = importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(index, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    t.same(
      expressRouter.get.getCalls().map((c) => c.firstArg),
      ["/", "/register", "/login", "/logout"]
    );
  });

  t.test("registers child routes", async (t) => {
    importModule(t, {
      mockExpress: true,
      mockChildRoutes: true,
    });

    const calls = expressRouter.use.getCalls();
    t.equal(calls.length, 4);
    t.equal(calls[0].args[0], "/fido2");
    t.equal(calls[0].args[1], fido2Route);
    t.equal(calls[1].args[0], "/profile");
    t.equal(calls[1].args[1], profileRoute);
    t.equal(calls[2].args[0], "/invites");
    t.equal(calls[2].args[1], invitesRoute);
    t.equal(calls[3].args[0], "/shares");
    t.equal(calls[3].args[1], sharesRoute);
  });

  t.test("GET /", async (t) => {
    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "/shares");
    });
  });

  t.test("GET /register", async (t) => {
    t.test("captures pre-auth state", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/register");

      t.ok(capturePreAuthStateFake.called);
      verifyRequest(t, capturePreAuthStateFake.firstCall.firstArg, {
        url: "/register",
        method: "GET",
      });
    });

    t.test("checks for a registerable session", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/register");

      t.ok(getRegisterableStub.called);
      verifyRequest(t, getRegisterableStub.firstCall.firstArg, {
        url: "/register",
        method: "GET",
      });
    });

    t.test(
      "if no registerable session, renders HTML with expected server error",
      async (t) => {
        getRegisterableStub.returns(undefined);
        const { app, renderArgs } = createIndexTestExpressApp(t);

        const response = await request(app).get("/register");
        const { viewName, options } = renderArgs;

        t.equal(response.status, StatusCodes.FORBIDDEN);
        t.match(response.headers["content-type"], "text/html");
        t.equal(viewName, "error");
        t.equal(options.title, "Error");
        t.match(
          options.message,
          "Registration not allowed without an invitation"
        );
      }
    );

    t.test("renders HTML with expected view state", async (t) => {
      getRegisterableStub.returns({ source: {} });
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/register?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "register");
      t.equal(options.title, "Sign up");
      t.equal(options.return_to, "/foo");
    });
  });

  t.test("GET /login", async (t) => {
    t.test("captures pre-auth state", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/login");

      t.ok(capturePreAuthStateFake.called);
      verifyRequest(t, capturePreAuthStateFake.firstCall.firstArg, {
        url: "/login",
        method: "GET",
      });
    });

    t.test("renders HTML with expected view state", async (t) => {
      const { app, renderArgs } = createIndexTestExpressApp(t);

      const response = await request(app).get("/login?return_to=/foo");
      const { viewName, options } = renderArgs;

      t.equal(response.status, StatusCodes.OK);
      t.match(response.headers["content-type"], "text/html");
      t.equal(viewName, "login");
      t.equal(options.title, "Sign in");
      t.equal(options.return_to, "/foo");
    });
  });

  t.test("GET /logout", async (t) => {
    t.test("performs sign out", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      await request(app).get("/logout");

      t.ok(signOutFake.called);
      verifyRequest(t, signOutFake.firstCall.firstArg, {
        url: "/logout",
        method: "GET",
      });
    });

    t.test("returns expected redirect", async (t) => {
      const { app } = createIndexTestExpressApp(t);

      const response = await request(app).get("/logout");

      t.equal(response.status, StatusCodes.MOVED_TEMPORARILY);
      t.equal(response.headers.location, "/");
    });
  });
});
