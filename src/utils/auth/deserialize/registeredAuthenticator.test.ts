import sinon from "sinon";
import { test } from "tap";

// test objects

const fixCreatedFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./registeredAuthenticator", {
    "./created": { fixCreated: fixCreatedFake },
  });
}

// tests

test("utils/auth/deserialize/registeredAuthenticator", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fixRegisteredAuthenticator", async (t) => {
    t.test("if empty target, throws expected error", async (t) => {
      const { fixRegisteredAuthenticator } = importModule(t);

      t.throws(() => fixRegisteredAuthenticator(undefined), {
        message: "Unexpected undefined value",
      });
    });

    t.test(
      "if it doesn't exist, does not attempt to fix the 'target.user.created' DateTime field",
      async (t) => {
        const target = {};

        const { fixRegisteredAuthenticator } = importModule(t);
        fixRegisteredAuthenticator(target);

        t.notOk(fixCreatedFake.called);
      }
    );

    t.test(
      "if exists, fixes the 'target.user.created' DateTime field",
      async (t) => {
        const user = {};
        const target = { user };

        const { fixRegisteredAuthenticator } = importModule(t);
        fixRegisteredAuthenticator(target);

        t.ok(fixCreatedFake.called);
        t.equal(fixCreatedFake.firstCall.firstArg, user);
      }
    );
  });
});
