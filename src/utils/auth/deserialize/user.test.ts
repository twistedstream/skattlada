import sinon from "sinon";
import { test } from "tap";

// test objects

const fixCreatedFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./user", {
    "./created": { fixCreated: fixCreatedFake },
  });
}

// tests

test("utils/auth/deserialize/user", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fixUser", async (t) => {
    t.test("fixes the 'target.created' DateTime field", async (t) => {
      const target = {};

      const { fixUser } = importModule(t);
      fixUser(target);

      t.ok(fixCreatedFake.called);
      t.equal(fixCreatedFake.firstCall.firstArg, target);
    });
  });
});
