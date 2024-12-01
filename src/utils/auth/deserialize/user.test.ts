import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const fixCreatedFake = sinon.fake();

// helpers

function importModule(t: Test) {
  return t.mockRequire("./user", {
    "./created": { fixCreated: fixCreatedFake },
  });
}

// tests

t.test("utils/auth/deserialize/user", async (t) => {
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
