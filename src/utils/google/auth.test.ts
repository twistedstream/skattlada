import sinon from "sinon";
import { test } from "tap";

// test objects

const googleAuthConstructorFake = sinon.fake();
class GoogleAuth {
  constructor(options: any) {
    googleAuthConstructorFake(options);
    this.isMock = true;
  }

  isMock: boolean;
}

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./auth", {
    "google-auth-library": {
      GoogleAuth,
    },
    "../config": {
      googleAuthClientEmail: "foo@example.com",
      googleAuthPrivateKey: "google-auth-private-key",
    },
  });
}

test("utils/google/auth", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("buildAuth", async (t) => {
    const { buildAuth } = importModule(t);

    t.test("returns a GoogleAuth instance with expected config", async (t) => {
      const result = buildAuth(["scope1", "scope2"]);

      t.ok(result.isMock);
      t.ok(googleAuthConstructorFake.called);
      t.same(googleAuthConstructorFake.firstCall.firstArg, {
        credentials: {
          client_email: "foo@example.com",
          private_key: "google-auth-private-key",
        },
        scopes: ["scope1", "scope2"],
      });
    });
  });
});
