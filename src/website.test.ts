import { NextFunction } from "express";
import sinon from "sinon";
import { test } from "tap";

// test objects

const expressRouter = {
  use: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const cookieSessionMiddleware = {};
const cookieSessionFake = sinon.fake.returns(cookieSessionMiddleware);
const authMiddleware = {};
const authFake = sinon.fake.returns(authMiddleware);
const cookieParserMiddleware = {};
const cookieParserFake = sinon.fake.returns(cookieParserMiddleware);
const routes = {};
const cookieSecret = "Bananas!";

// helpers

function importModule(test: Tap.Test) {
  const { default: website } = test.mock("./website", {
    express: {
      Router: routerFake,
    },
    "cookie-session": cookieSessionFake,
    "./utils/config": {
      cookieSecret,
    },
    "./routes": routes,
    "./utils/auth": { auth: authFake },
    "cookie-parser": cookieParserFake,
  });

  return website;
}

// tests

test("website", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const website = importModule(t);

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(website, expressRouter);
  });

  t.test("uses cookie-session middleware", async (t) => {
    importModule(t);

    t.ok(cookieSessionFake.called);
    t.same(cookieSessionFake.firstCall.firstArg, {
      name: "ts-session",
      secret: "Bananas!",
      maxAge: 86400000,
    });

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[0].firstArg, cookieSessionMiddleware);
  });

  t.test("uses auth middleware", async (t) => {
    importModule(t);

    t.ok(authFake.called);
    t.equal(authFake.firstCall.args.length, 0);

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[1].firstArg, authMiddleware);
  });

  t.test("uses cookie-parser middleware", async (t) => {
    importModule(t);

    t.ok(cookieParserFake.called);
    t.equal(cookieParserFake.firstCall.firstArg, "Bananas!");

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[2].firstArg, cookieParserMiddleware);
  });

  t.test("sets locals user to request user", async (t) => {
    importModule(t);

    t.ok(expressRouter.use.called);

    // test behavior of middleware function
    const req: any = { user: "bob" };
    const res: any = { locals: {} };
    const nextFake = sinon.fake();
    const middleware: (req: any, res: any, next: NextFunction) => void =
      expressRouter.use.getCalls()[3].firstArg;
    middleware(req, res, nextFake);
    t.equal(res.locals.user, req.user);
    t.ok(nextFake.called);
  });

  t.test("registers routes router", async (t) => {
    importModule(t);

    t.ok(expressRouter.use.called);
    t.equal(expressRouter.use.getCalls()[4].firstArg, routes);
  });
});
