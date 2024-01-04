import { StatusCodes } from "http-status-codes";
import { DateTime } from "luxon";
import sinon from "sinon";
import { test } from "tap";

import { testNowDate, testUser1 } from "../testing/data";

// test objects

const nowFake = sinon.fake.returns(testNowDate);
const fixRegisterableSourceFake = sinon.fake();
const fixRegisteredAuthenticatorFake = sinon.fake();
const fixUserFake = sinon.fake();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "../../utils/time": { now: nowFake },
    "./deserialize": {
      fixRegisterableSource: fixRegisterableSourceFake,
      fixRegisteredAuthenticator: fixRegisteredAuthenticatorFake,
      fixUser: fixUserFake,
    },
  });
}

// tests

test("utils/auth", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("capturePreAuthState", async (t) => {
    t.test("captured return_to query in session", async (t) => {
      const req: any = { query: { return_to: "/foo" } };

      const { capturePreAuthState } = importModule(t);
      capturePreAuthState(req);

      t.ok(req.session);
      t.equal(req.session.return_to, "/foo");
    });
  });

  t.test("authorizeRegistration", async (t) => {
    t.test("saves registerable state in session", async (t) => {
      const req: any = {};
      const source = {};

      const { authorizeRegistration } = importModule(t);
      authorizeRegistration(req, source);

      t.ok(req.session);
      const { registerable } = req.session;
      t.ok(registerable);
      t.equal(registerable.source, source);
    });
  });

  t.test("beginSignup", async (t) => {
    t.test("saves registration state in session", async (t) => {
      const user1 = testUser1();
      const req: any = {};

      const { beginSignup } = importModule(t);
      beginSignup(req, "CHALLENGE!", user1);

      t.ok(req.session);
      const { registration } = req.session;
      t.ok(registration);
      t.same(registration.registeringUser, {
        id: user1.id,
        created: user1.created,
        username: user1.username,
        displayName: user1.displayName,
        isAdmin: false,
      });
      t.equal(registration.challenge, "CHALLENGE!");
    });
  });

  t.test("beginSignIn", async (t) => {
    t.test("saves authentication state in session", async (t) => {
      t.test("when existing user", async (t) => {
        const user1 = testUser1();
        const req: any = {};

        const { beginSignIn } = importModule(t);
        beginSignIn(req, "CHALLENGE!", user1, "preferred");

        t.ok(req.session);
        const { authentication } = req.session;
        t.ok(authentication);
        t.same(authentication.authenticatingUser, user1);
        t.equal(authentication.challenge, "CHALLENGE!");
        t.equal(authentication.userVerification, "preferred");
      });

      t.test("when no existing user", async (t) => {
        const req: any = {};

        const { beginSignIn } = importModule(t);
        beginSignIn(req, "CHALLENGE!", undefined, "preferred");

        t.ok(req.session);
        const { authentication } = req.session;
        t.ok(authentication);
        t.notOk(authentication.authenticatingUser);
        t.equal(authentication.challenge, "CHALLENGE!");
        t.equal(authentication.userVerification, "preferred");
      });
    });
  });

  t.test("signIn", async (t) => {
    t.test("saves registered credential in session", async (t) => {
      const req: any = {};
      const credential = {};

      const { signIn } = importModule(t);
      signIn(req, credential);

      t.ok(req.session);
      const { authentication } = req.session;
      t.ok(authentication);
      t.equal(authentication.credential, credential);
      t.ok(authentication.time);
    });

    t.test("clears temp session values", async (t) => {
      const req: any = { registration: {}, return_to: "/foo" };
      const credential = {};

      const { signIn } = importModule(t);
      signIn(req, testUser1(), credential);

      t.ok(req.session);
      t.notOk(req.session.registration);
      t.notOk(req.session.return_to);
    });
  });

  t.test("signOut", async (t) => {
    t.test("clears the session", async (t) => {
      const req = { session: {} };

      const { signOut } = importModule(t);
      signOut(req);

      t.notOk(req.session);
    });
  });

  t.test("getAuthentication", async (t) => {
    t.test("if it exists, returns the authentication state", async (t) => {
      const authentication = {};
      const req = { session: { authentication } };

      const { getAuthentication } = importModule(t);
      const result = getAuthentication(req);

      t.equal(result, authentication);
    });

    t.test(
      "if it exists, fixes the deserialization of the authentication state's user object",
      async (t) => {
        const authenticatingUser = {};
        const authentication = { authenticatingUser };
        const req = { session: { authentication } };

        const { getAuthentication } = importModule(t);
        getAuthentication(req);

        t.ok(fixUserFake.called);
        t.equal(fixUserFake.firstCall.firstArg, authenticatingUser);
      }
    );

    t.test("if it doesn't exist, returns nothing", async (t) => {
      const req = {};

      const { getAuthentication } = importModule(t);
      const result = getAuthentication(req);

      t.equal(result, undefined);
    });
  });

  t.test("getRegistration", async (t) => {
    t.test("if it exists, returns the registration state", async (t) => {
      const registration = {};
      const req = { session: { registration } };

      const { getRegistration } = importModule(t);
      const result = getRegistration(req);

      t.equal(result, registration);
    });

    t.test(
      "if it exists, fixes the deserialization of the registration state's user object",
      async (t) => {
        const registeringUser = {};
        const registration = { registeringUser };
        const req = { session: { registration } };

        const { getRegistration } = importModule(t);
        getRegistration(req);

        t.ok(fixUserFake.called);
        t.equal(fixUserFake.firstCall.firstArg, registeringUser);
      }
    );

    t.test("if it doesn't exist, returns nothing", async (t) => {
      const req = {};

      const { getRegistration } = importModule(t);
      const result = getRegistration(req);

      t.equal(result, undefined);
    });
  });

  t.test("getRegisterable", async (t) => {
    t.test("if it exists, returns the registerable state", async (t) => {
      const registerable = {};
      const req = { session: { registerable } };

      const { getRegisterable } = importModule(t);
      const result = getRegisterable(req);

      t.equal(result, registerable);
    });

    t.test(
      "if it exists, fixes the deserialization of the registerable state's source object",
      async (t) => {
        const source = {};
        const registerable = { source };
        const req = { session: { registerable } };

        const { getRegisterable } = importModule(t);
        getRegisterable(req);

        t.ok(fixRegisterableSourceFake.called);
        t.equal(fixRegisterableSourceFake.firstCall.firstArg, source);
      }
    );

    t.test("if it doesn't exist, returns nothing", async (t) => {
      const req = {};

      const { getRegisterable } = importModule(t);
      const result = getRegisterable(req);

      t.equal(result, undefined);
    });
  });

  t.test("clearRegisterable", async (t) => {
    t.test("clears temp session values", async (t) => {
      const req = { session: { registerable: {} } };

      const { clearRegisterable } = importModule(t);
      clearRegisterable(req);

      t.ok(req.session);
      t.notOk(req.session.registerable);
    });

    t.test("if there is no session, has same result", async (t) => {
      const req: any = {};

      const { clearRegisterable } = importModule(t);
      clearRegisterable(req);

      t.ok(req.session);
      t.notOk(req.session.registerable);
    });
  });

  t.test("redirectToRegister", async (t) => {
    const redirectFake = sinon.fake();
    const req = { originalUrl: "/foo" };
    const res = { redirect: redirectFake };

    t.test(
      "performs redirect to register endpoint with return_to of current URL",
      async (t) => {
        const { redirectToRegister } = importModule(t);
        redirectToRegister(req, res, false);

        t.ok(redirectFake.called);
        t.equal(redirectFake.firstCall.firstArg, "/register?return_to=%2Ffoo");
      }
    );

    t.test("includes hide_sign_in query param if specified", async (t) => {
      const { redirectToRegister } = importModule(t);
      redirectToRegister(req, res, true);

      t.ok(redirectFake.called);
      t.equal(
        redirectFake.firstCall.firstArg,
        "/register?return_to=%2Ffoo&hide_sign_in=true"
      );
    });
  });

  t.test("redirectToLogin", async (t) => {
    t.test(
      "performs redirect to login endpoint with return_to of current URL",
      async (t) => {
        const redirectFake = sinon.fake();
        const req = { originalUrl: "/foo" };
        const res = { redirect: redirectFake };

        const { redirectToLogin } = importModule(t);
        redirectToLogin(req, res);

        t.ok(redirectFake.called);
        t.equal(redirectFake.firstCall.firstArg, "/login?return_to=%2Ffoo");
      }
    );
  });

  t.test("auth", async (t) => {
    const user = {};
    const credential = { user };
    const res = {};

    t.test("when user authenticated", async (t) => {
      let req: any;
      const nextFake = sinon.fake();

      t.beforeEach(async () => {
        req = {
          session: {
            authentication: { time: DateTime.now().toMillis(), credential },
          },
        };
      });

      t.test("sets expected req fields", async (t) => {
        const { auth } = importModule(t);
        const middleware = auth();

        middleware(req, res, nextFake);

        t.equal(req.user, user);
        t.equal(req.credential, credential);
        t.ok(nextFake.called);
      });

      t.test(
        "fixes the deserialization of the authentication state's credential object",
        async (t) => {
          const { auth } = importModule(t);
          const middleware = auth();

          middleware(req, res, nextFake);

          t.ok(fixRegisteredAuthenticatorFake.called);
          t.equal(
            fixRegisteredAuthenticatorFake.firstCall.firstArg,
            credential
          );
        }
      );
    });

    t.test(
      "if user not authenticated, does not set expected req fields",
      async (t) => {
        const req = {};
        const nextFake = sinon.fake();

        const { auth } = importModule(t);
        const middleware = auth();

        middleware(req, res, nextFake);

        t.same(req, {});
        t.ok(nextFake.called);
      }
    );
  });

  t.test("requiresAuth", async (t) => {
    t.test(
      "if user is not authenticated, returns expected error",
      async (t) => {
        const req = {};
        const res = {};
        const nextFake = sinon.fake();

        const { requiresAuth } = importModule(t);
        const middleware = requiresAuth();

        middleware(req, res, nextFake);

        t.ok(nextFake.called);
        t.same(nextFake.firstCall.firstArg, {
          name: "Error",
          message: "Unauthorized",
          statusCode: StatusCodes.UNAUTHORIZED,
        });
      }
    );

    t.test("if user is authenticated, does not redirect", async (t) => {
      const req = { user: {}, originalUrl: "/foo" };
      const res = {};
      const nextFake = sinon.fake();

      const { requiresAuth } = importModule(t);
      const middleware = requiresAuth();

      middleware(req, res, nextFake);

      t.ok(nextFake.called);
    });
  });

  t.test("requiresAdmin", async (t) => {
    t.test(
      "if user is not authenticated, returns expected error",
      async (t) => {
        const req = {};
        const res = {};
        const nextFake = sinon.fake();

        const { requiresAdmin } = importModule(t);
        const middleware = requiresAdmin();

        middleware(req, res, nextFake);

        t.ok(nextFake.called);
        t.same(nextFake.firstCall.firstArg, {
          name: "Error",
          message: "Forbidden: Requires admin role",
          statusCode: StatusCodes.FORBIDDEN,
        });
      }
    );

    t.test("if user is not an admin, returns expected error", async (t) => {
      const req = { user: {} };
      const res = {};
      const nextFake = sinon.fake();

      const { requiresAdmin } = importModule(t);
      const middleware = requiresAdmin();

      middleware(req, res, nextFake);

      t.ok(nextFake.called);
      t.same(nextFake.firstCall.firstArg, {
        name: "Error",
        message: "Forbidden: Requires admin role",
        statusCode: StatusCodes.FORBIDDEN,
      });
    });

    t.test("if user is an admin, nothing happens", async (t) => {
      const req = { user: { isAdmin: true } };
      const res = {};
      const nextFake = sinon.fake();

      const { requiresAdmin } = importModule(t);
      const middleware = requiresAdmin();

      middleware(req, res, nextFake);

      t.ok(nextFake.called);
      t.equal(nextFake.firstCall.args.length, 0);
    });
  });
});
