import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const expressApp = {
  disable: sinon.fake(),
  use: sinon.fake(),
  set: sinon.fake(),
  engine: sinon.fake(),
};
const helmetMiddleware = {};
const helmetFake = sinon.fake.returns(helmetMiddleware);
const expressPinoMiddleware = {};
const pinoHttpFake = sinon.fake.returns(expressPinoMiddleware);
const staticMiddleware = {};
const expressStaticFactoryFake = sinon.fake.returns(staticMiddleware);
const expressFactoryFake: any = sinon.fake.returns(expressApp);
expressFactoryFake.static = expressStaticFactoryFake;
const handlebarsEngine = {};
const handlebarsEngineFake = sinon.fake.returns(handlebarsEngine);
const logger = {};
const website = {};
const errorHandlerFake = sinon.fake();

// helpers

function importModule(t: Test) {
  const { default: app } = t.mockRequire("./app", {
    express: expressFactoryFake,
    helmet: helmetFake,
    "pino-http": pinoHttpFake,
    "express-handlebars": {
      engine: handlebarsEngineFake,
    },
    "./utils/config": {
      packageDescription: "Skattlåda!",
      packageVersion: "42.1",
    },
    "./utils/logger": {
      logger,
    },
    "./website": website,
    "./error-handler": errorHandlerFake,
  });

  return app;
}

// tests

t.test("app", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is an Express instance", async (t) => {
    const app = importModule(t);

    t.ok(expressFactoryFake.called);
    t.equal(expressFactoryFake.firstCall.args.length, 0);
    t.equal(app, expressApp);
  });

  t.test("reduces server fingerprinting", async (t) => {
    importModule(t);

    t.ok(expressApp.disable.called);
    t.equal(expressApp.disable.getCalls()[0].firstArg, "x-powered-by");
  });

  t.test(
    "uses helmet middleware and configures a compatible content security policy",
    async (t) => {
      importModule(t);

      t.ok(helmetFake.called);
      t.same(helmetFake.firstCall.firstArg, {
        contentSecurityPolicy: {
          directives: {
            "script-src": [
              "'unsafe-inline'",
              "'self'",
              "cdn.jsdelivr.net",
              "unpkg.com",
            ],
          },
        },
      });

      t.ok(expressApp.use.called);
      t.equal(expressApp.use.getCalls()[0].firstArg, helmetMiddleware);
    },
  );

  t.test("uses express-pino-logger middleware", async (t) => {
    importModule(t);

    t.ok(pinoHttpFake.called);
    t.same(pinoHttpFake.firstCall.firstArg, { logger: {} });
    t.equal(pinoHttpFake.firstCall.firstArg.logger, logger);

    t.ok(expressApp.use.called);
    t.equal(expressApp.use.getCalls()[1].firstArg, expressPinoMiddleware);
  });

  t.test("uses static middleware", async (t) => {
    importModule(t);

    t.ok(expressStaticFactoryFake.called);
    t.equal(expressStaticFactoryFake.firstCall.firstArg, "public");

    t.ok(expressApp.use.called);
    t.equal(expressApp.use.getCalls()[2].firstArg, staticMiddleware);
  });

  t.test("configures the handlebars view engine", async (t) => {
    t.test("for Express", async (t) => {
      importModule(t);

      t.ok(expressApp.set.called);
      t.equal(expressApp.set.firstCall.args[0], "view engine");
      t.equal(expressApp.set.firstCall.args[1], "handlebars");

      t.ok(expressApp.engine.called);
      t.equal(expressApp.engine.firstCall.args[0], "handlebars");
      t.equal(expressApp.engine.firstCall.args[1], handlebarsEngine);

      t.ok(handlebarsEngineFake.called);
      t.ok(handlebarsEngineFake.firstCall.firstArg);
      t.equal(handlebarsEngineFake.firstCall.firstArg.defaultLayout, "main");
      t.ok(handlebarsEngineFake.firstCall.firstArg.helpers);
    });

    t.test("with helpers", async (t) => {
      importModule(t);
      const { helpers } = handlebarsEngineFake.firstCall.firstArg;

      t.equal(helpers.product(), "Skattlåda!");
      t.equal(helpers.version(), "42.1");
    });
  });

  t.test("uses website router", async (t) => {
    importModule(t);

    t.ok(expressApp.use.called);
    t.equal(expressApp.use.getCalls()[3].firstArg, website);
  });

  t.test("configures error handling", async (t) => {
    const app = importModule(t);

    t.ok(errorHandlerFake.called);
    t.equal(errorHandlerFake.firstCall.firstArg, app);
  });
});
