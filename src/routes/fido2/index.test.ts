import sinon from "sinon";
import { test } from "tap";

// test objects

const expressRouter = {
  use: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const assertionRoute = {};
const attestationRoute = {};

// helpers

function importModule(test: Tap.Test) {
  expressRouter.use.resetHistory();
  routerFake.resetHistory();

  const { default: router } = test.mock("./index", {
    express: {
      Router: routerFake,
    },
    "./assertion": assertionRoute,
    "./attestation": attestationRoute,
  });

  return router;
}

// tests

test("routes/fido2/index", async (t) => {
  t.beforeEach(async (t) => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const index = importModule(t);

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(index, expressRouter);
  });

  t.test("registers child routes", async (t) => {
    importModule(t);

    const calls = expressRouter.use.getCalls();
    t.equal(calls[0].args[0], "/assertion");
    t.equal(calls[0].args[1], assertionRoute);
    t.equal(calls[1].args[0], "/attestation");
    t.equal(calls[1].args[1], attestationRoute);
  });
});
