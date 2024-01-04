import sinon from "sinon";
import { test } from "tap";

// test objects

const fixCreatedFake = sinon.fake();
const fixDateTimeFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./registerableSource", {
    "./created": { fixCreated: fixCreatedFake },
    "./dateTime": { fixDateTime: fixDateTimeFake },
  });
}

// tests

test("utils/auth/deserialize/registerableSource", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fixRegisterableSource", async (t) => {
    t.test("if empty target, throws expected error", async (t) => {
      const { fixRegisterableSource } = importModule(t);

      t.throws(() => fixRegisterableSource(undefined), {
        message: "Unexpected undefined value",
      });
    });

    t.test(
      "fixes the 'target.created' and 'target.createdBy.created' DateTime fields",
      async (t) => {
        const createdBy = {};
        const target = { createdBy };

        const { fixRegisterableSource } = importModule(t);
        fixRegisterableSource(target);

        t.ok(fixCreatedFake.called);
        t.equal(fixCreatedFake.getCall(0).firstArg, target);
        t.equal(fixCreatedFake.getCall(1).firstArg, createdBy);
      }
    );

    t.test(
      "if it doesn't exist, does not attempt to fix the 'target.claimed' DateTime field",
      async (t) => {
        const target = {};

        const { fixRegisterableSource } = importModule(t);
        fixRegisterableSource(target);

        t.notOk(fixDateTimeFake.called);
      }
    );

    t.test(
      "if exists, fixes the 'target.claimed' DateTime field",
      async (t) => {
        const target = { claimed: "DATE" };

        const { fixRegisterableSource } = importModule(t);
        fixRegisterableSource(target);

        t.ok(fixDateTimeFake.called);
        t.equal(fixDateTimeFake.firstCall.args[0], target);
        t.equal(fixDateTimeFake.firstCall.args[1], "claimed");
      }
    );

    t.test(
      "if it doesn't exist, does not attempt to fix the 'target.claimedBy.created' DateTime field",
      async (t) => {
        const target = {};

        const { fixRegisterableSource } = importModule(t);
        fixRegisterableSource(target);

        t.equal(fixCreatedFake.getCalls().length, 2);
      }
    );

    t.test(
      "if exists, fixes the 'target.claimedBy.created' DateTime field",
      async (t) => {
        const claimedBy = {};
        const target = { claimedBy };

        const { fixRegisterableSource } = importModule(t);
        fixRegisterableSource(target);

        t.ok(fixCreatedFake.called);
        t.equal(fixCreatedFake.getCalls().length, 3);
        t.equal(fixCreatedFake.getCall(2).firstArg, claimedBy);
      }
    );
  });
});
