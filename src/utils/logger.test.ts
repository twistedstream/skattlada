import sinon from "sinon";
import { t } from "tap";

// NOTE: Env vars are being sourced from test.env

t.test("utils/logger", async (t) => {
  t.test("logger", async (t) => {
    t.test("creates a pino logger with expected configuration", async (t) => {
      const pinoFake = sinon.fake();

      t.mockRequire("./logger", {
        pino: pinoFake,
        "./config": {
          packageName: "test-package",
          logLevel: "debug",
        },
      });

      t.same(pinoFake.firstCall.firstArg, {
        name: "test-package",
        level: "debug",
      });
    });
  });
});
