import sinon from "sinon";
import { test } from "tap";

// test objects

const fixDateTimeFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./created", {
    "./dateTime": { fixDateTime: fixDateTimeFake },
  });
}

// tests

test("utils/auth/deserialize/created", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fixCreated", async (t) => {
    t.test("if empty target, throws expected error", async (t) => {
      const { fixCreated } = importModule(t);

      t.throws(() => fixCreated(undefined), {
        message: "Unexpected undefined value",
      });
    });

    t.test("fixes the 'target.created' DateTime field", async (t) => {
      const obj = {};

      const { fixCreated } = importModule(t);
      fixCreated(obj);

      t.ok(fixDateTimeFake.called);
      t.equal(fixDateTimeFake.firstCall.args[0], obj);
      t.equal(fixDateTimeFake.firstCall.args[1], "created");
    });
  });
});
