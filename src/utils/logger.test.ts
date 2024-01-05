import sinon from "sinon";
import { test } from "tap";

// NOTE: Env vars are being sourced from test.env

test("utils/logger", async (t) => {
  t.test("logger", async (t) => {
    t.test("creates a pino logger with expected configuration", async (t) => {
      const pinoFake = sinon.fake();

      t.mock("./logger", {
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
