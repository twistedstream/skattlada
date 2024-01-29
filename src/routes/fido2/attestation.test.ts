import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { Express } from "express";
import sinon from "sinon";
import request, { Test as SuperTest } from "supertest";
import { test } from "tap";

import { StatusCodes } from "http-status-codes";
import { ValidationError } from "../../types/error";
import {
  testCredential1,
  testNowDate,
  testUser1,
} from "../../utils/testing/data";
import {
  createTestExpressApp,
  verifyFido2SuccessResponse,
  verifyRequest,
  verifyServerErrorFido2ServerResponse,
  verifyUserErrorFido2ServerResponse,
} from "../../utils/testing/unit";

type MockOptions = {
  mockExpress?: boolean;
  mockModules?: boolean;
};

type AttestationTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const testCred1 = testCredential1();
const testValidatedCredential = {
  ...testCred1,
  credentialID: isoBase64URL.toBuffer(testCred1.credentialID),
  credentialPublicKey: isoBase64URL.toBuffer(testCred1.credentialPublicKey),
};

const testRegistration = {
  registeringUser: testUser1(),
  challenge: "CHALLENGE!",
};

const expressRouter = {
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const logger = {
  debug: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
};
const nowFake = sinon.fake.returns(testNowDate);
const getRegisterableStub = sinon.stub();
const newUserStub = sinon.stub();
const fetchUserByIdStub = sinon.stub();
const fetchCredentialsByUserIdStub = sinon.stub();
const fetchUserByNameStub = sinon.stub();
const generateRegistrationOptionsStub = sinon.stub();
const beginSignupFake = sinon.fake();
const verifyRegistrationResponseStub = sinon.stub();
const registerUserStub = sinon.stub();
const signInStub = sinon.stub();
const addUserCredentialFake = sinon.fake();
const fetchCredentialByIdStub = sinon.stub();
const getRegistrationStub = sinon.stub();

// helpers

function importModule(
  test: Tap.Test,
  { mockExpress = false, mockModules = false }: MockOptions = {}
) {
  const { default: router } = test.mock("./attestation", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockModules && {
      "../../utils/logger": { logger },
      "../../utils/time": { now: nowFake },
      "../../services/user": {
        newUser: newUserStub,
        fetchUserById: fetchUserByIdStub,
        fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
        fetchUserByName: fetchUserByNameStub,
        registerUser: registerUserStub,
        addUserCredential: addUserCredentialFake,
        fetchCredentialById: fetchCredentialByIdStub,
      },
      "@simplewebauthn/server": {
        generateRegistrationOptions: generateRegistrationOptionsStub,
        verifyRegistrationResponse: verifyRegistrationResponseStub,
      },
      "../../utils/config": {
        baseUrl: "https://example.com",
        rpName: "Example, Inc.",
        rpID: "example.com",
      },
      "../../utils/auth": {
        beginSignup: beginSignupFake,
        signIn: signInStub,
        getRegisterable: getRegisterableStub,
        getRegistration: getRegistrationStub,
      },
    }),
  });

  return router;
}

function createAttestationTestExpressApp(
  test: Tap.Test,
  { withAuth, suppressErrorOutput }: AttestationTestExpressAppOptions = {}
) {
  const router = importModule(test, { mockModules: true });

  return createTestExpressApp({
    authSetup: withAuth
      ? {
          originalUrl: "/",
          activeUser: testUser1(),
          activeCredential: testCredential1(),
        }
      : undefined,
    middlewareSetup: (app) => {
      app.use(router);
    },
    errorHandlerSetup: {
      test,
      modulePath: "../../routes/fido2/error-handler",
      suppressErrorOutput,
    },
  });
}

function performOptionsPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/options")
    .set("Content-Type", "application/json")
    .accept("application/json");
}

function performResultPostRequest(app: Express): SuperTest {
  return request(app)
    .post("/result")
    .set("Content-Type", "application/json")
    .accept("application/json");
}

// tests

test("routes/fido2/attestation", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("is a Router instance", async (t) => {
    const profile = importModule(t, { mockExpress: true });

    t.ok(routerFake.called);
    t.equal(routerFake.firstCall.args.length, 0);
    t.equal(profile, expressRouter);
  });

  t.test("registers expected endpoints", async (t) => {
    importModule(t, { mockExpress: true });

    t.same(
      expressRouter.post.getCalls().map((c) => c.firstArg),
      ["/options", "/result"]
    );
  });

  t.test("POST /options", async (t) => {
    t.test("if active user session", async (t) => {
      t.test("fetches exiting user by ID", async (t) => {
        newUserStub.resolves({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([testCredential1()]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsPostRequest(app);

        t.ok(fetchUserByIdStub.called);
        t.same(fetchUserByIdStub.firstCall.firstArg, "123abc");
      });

      t.test(
        "if user that doesn't actually exist, renders JSON with expected user error",
        async (t) => {
          newUserStub.resolves({});
          fetchUserByIdStub.resolves();

          const { app } = createAttestationTestExpressApp(t, {
            withAuth: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "User with ID 123abc no longer exists"
          );
        }
      );

      t.test("fetches user's existing credentials", async (t) => {
        newUserStub.resolves({});
        fetchUserByIdStub.resolves({});
        fetchCredentialsByUserIdStub.resolves([testCredential1()]);

        const { app } = createAttestationTestExpressApp(t, {
          withAuth: true,
        });
        await performOptionsPostRequest(app);

        t.ok(fetchCredentialsByUserIdStub.called);
        t.equal(fetchCredentialsByUserIdStub.firstCall.firstArg, "123abc");
      });

      t.test(
        "if no credentials of existing user, render JSON with expected server error",
        async (t) => {
          newUserStub.resolves({});
          fetchUserByIdStub.resolves({});
          fetchCredentialsByUserIdStub.resolves([]);

          const { app } = createAttestationTestExpressApp(t, {
            withAuth: true,
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      );
    });

    t.test("if no active user session", async (t) => {
      t.test("checks for a registerable session", async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
          displayName: "Bob User",
        });

        t.ok(getRegisterableStub.called);
        verifyRequest(t, getRegisterableStub.firstCall.firstArg, {
          url: "/options",
          method: "POST",
        });
      });

      t.test(
        "if no registerable session, renders JSON with expected user error",
        async (t) => {
          getRegisterableStub.returns(undefined);

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
            displayName: "Bob User",
          });

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.FORBIDDEN,
            "Cannot register a new user without a registerable session"
          );
        }
      );

      t.test("instantiates a new user", async (t) => {
        getRegisterableStub.returns({});
        newUserStub.resolves({});

        const { app } = createAttestationTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
          displayName: "Bob User",
        });

        t.ok(newUserStub.called);
        t.equal(newUserStub.firstCall.args[0], "bob");
        t.equal(newUserStub.firstCall.args[1], "Bob User");
      });

      t.test(
        "if a validation error occurs while instantiating a user, renders JSON with expected user error",
        async (t) => {
          getRegisterableStub.returns({});
          newUserStub.rejects(
            new ValidationError("User", "username", "Sorry, can't do it")
          );

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsPostRequest(app);

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "Sorry, can't do it",
            "User.username"
          );
        }
      );

      t.test(
        "if an unknown error occurs while instantiating a user, renders JSON with expected server error",
        async (t) => {
          getRegisterableStub.returns({});
          newUserStub.rejects(new Error("BOOM!"));

          const { app } = createAttestationTestExpressApp(t, {
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app);

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR
          );
        }
      );

      t.test("fetches exiting user by specified username", async (t) => {
        getRegisterableStub.returns({});
        newUserStub.resolves({});
        fetchUserByNameStub.resolves({});

        const { app } = createAttestationTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(fetchUserByNameStub.called);
        t.equal(fetchUserByNameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if user exists with same username, renders JSON with expected user error",
        async (t) => {
          getRegisterableStub.returns({});
          newUserStub.resolves({});
          fetchUserByNameStub.resolves({});

          const { app } = createAttestationTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "A user with username 'bob' already exists",
            "User.username"
          );
        }
      );
    });

    t.test("generates registration options", async (t) => {
      const cred1 = testCredential1();
      fetchUserByIdStub.resolves({
        id: "123abc",
        username: "bob",
        displayName: "Bob User",
      });
      fetchCredentialsByUserIdStub.resolves([cred1]);
      generateRegistrationOptionsStub.resolves({});

      const { app } = createAttestationTestExpressApp(t, { withAuth: true });
      await performOptionsPostRequest(app).send({
        attestation: "platform",
      });

      t.ok(generateRegistrationOptionsStub.called);
      t.same(generateRegistrationOptionsStub.firstCall.firstArg, {
        rpName: "Example, Inc.",
        rpID: "example.com",
        userID: "123abc",
        userName: "bob",
        userDisplayName: "Bob User",
        attestationType: "platform",
        excludeCredentials: [
          {
            id: isoBase64URL.toBuffer(cred1.credentialID),
            type: "public-key",
            transports: cred1.transports ? [...cred1.transports] : [],
          },
        ],
      });
    });

    t.test("begins sign up", async (t) => {
      getRegisterableStub.returns({});
      const registeringUser = {};
      newUserStub.resolves(registeringUser);
      fetchUserByNameStub.resolves();
      generateRegistrationOptionsStub.resolves({
        challenge: "CHALLENGE!",
      });

      const { app } = createAttestationTestExpressApp(t);
      await performOptionsPostRequest(app);

      t.ok(beginSignupFake.called);
      verifyRequest(t, beginSignupFake.firstCall.args[0], {
        url: "/options",
        method: "POST",
      });
      t.equal(beginSignupFake.firstCall.args[1], "CHALLENGE!");
      t.equal(beginSignupFake.firstCall.args[2], registeringUser);
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        getRegisterableStub.returns({});
        const registeringUser = {};
        newUserStub.resolves(registeringUser);
        fetchUserByNameStub.resolves();
        generateRegistrationOptionsStub.resolves({
          challenge: "CHALLENGE!",
        });

        const { app } = createAttestationTestExpressApp(t);
        const response = await performOptionsPostRequest(app);

        verifyFido2SuccessResponse(t, response, {
          challenge: "CHALLENGE!",
        });
      }
    );
  });

  t.test("POST /result", async (t) => {
    t.test(
      "if credential ID is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Missing: credential ID"
        );
      }
    );

    t.test(
      "if authentication response is missing from request, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Missing: authentication response"
        );
      }
    );

    t.test("gets the registration state", async (t) => {
      const cred1 = testCredential1();
      getRegistrationStub.returns({});
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential },
      });
      fetchCredentialByIdStub.resolves({
        ...cred1,
        created: testNowDate,
        user: testUser1(),
      });

      const { app } = createAttestationTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
        response: {},
      });

      t.ok(getRegistrationStub.called);
      verifyRequest(t, getRegistrationStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test(
      "if registration state is missing, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(undefined);

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "No active registration"
        );
      }
    );

    t.test("verifies registration response", async (t) => {
      const cred1 = testCredential1();
      getRegistrationStub.returns(testRegistration);
      verifyRegistrationResponseStub.returns({
        registrationInfo: { ...testValidatedCredential },
      });
      fetchCredentialByIdStub.resolves({
        ...cred1,
        created: testNowDate,
        user: testUser1(),
      });

      const { app } = createAttestationTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
        response: {
          transports: ["ble", "usb"],
        },
      });

      t.ok(verifyRegistrationResponseStub.called);
      t.same(verifyRegistrationResponseStub.firstCall.firstArg, {
        response: {
          id: cred1.credentialID,
          response: {
            transports: ["ble", "usb"],
          },
        },
        expectedChallenge: "CHALLENGE!",
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
      });
    });

    t.test(
      "if registration response verification fails, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        const err = new Error("BOOM!");
        verifyRegistrationResponseStub.throws(err);

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Registration failed: BOOM!"
        );
        // test for warning log message
        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], err);
        t.match(logger.warn.firstCall.args[1], "Registration error");
      }
    );

    t.test("if active user session", async (t) => {
      t.test("adds credential to existing user", async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });

        const { app } = createAttestationTestExpressApp(t, { withAuth: true });
        await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(addUserCredentialFake.called);
        t.equal(addUserCredentialFake.firstCall.args[0], "123abc");
        t.same(addUserCredentialFake.firstCall.args[1], {
          ...cred1,
          created: testNowDate,
        });
      });
    });

    t.test("if no active user session", async (t) => {
      t.test("checks for a registerable session", async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        fetchCredentialByIdStub.resolves({
          ...cred1,
          created: testNowDate,
          user: testUser1(),
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(getRegisterableStub.called);
        verifyRequest(t, getRegisterableStub.firstCall.firstArg, {
          url: "/result",
          method: "POST",
        });
      });

      t.test(
        "if no registerable session, renders JSON with expected user error",
        async (t) => {
          const cred1 = testCredential1();
          getRegistrationStub.returns(testRegistration);
          verifyRegistrationResponseStub.returns({
            registrationInfo: { ...testValidatedCredential },
          });
          getRegisterableStub.returns(undefined);

          const { app } = createAttestationTestExpressApp(t);
          const response = await performResultPostRequest(app).send({
            id: cred1.credentialID,
            response: {
              transports: ["internal"],
            },
          });

          verifyUserErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.BAD_REQUEST,
            "No active registerable session"
          );
        }
      );

      t.test(
        "registers new user with credential and registerable source properties",
        async (t) => {
          const user1 = testUser1();
          const cred1 = testCredential1();
          getRegistrationStub.returns(testRegistration);
          verifyRegistrationResponseStub.returns({
            registrationInfo: { ...testValidatedCredential },
          });
          const testSource = {
            // testing that these properties get set in the created user
            isAdmin: true,
          };
          getRegisterableStub.returns({
            source: testSource,
          });
          fetchCredentialByIdStub.resolves({
            ...cred1,
            created: testNowDate,
            user: user1,
          });

          const { app } = createAttestationTestExpressApp(t);
          await performResultPostRequest(app).send({
            id: cred1.credentialID,
            response: {
              transports: ["internal"],
            },
          });

          t.ok(registerUserStub.called);
          t.same(registerUserStub.firstCall.args[0], {
            ...user1,
            ...testSource,
          });
          t.same(registerUserStub.firstCall.args[1], {
            ...cred1,
            created: testNowDate,
          });
        }
      );

      t.test("fetches registered credential", async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        getRegisterableStub.returns({ source: {} });
        fetchCredentialByIdStub.resolves({
          ...cred1,
          created: testNowDate,
          user: testUser1(),
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(fetchCredentialByIdStub.called);
        t.equal(fetchCredentialByIdStub.firstCall.firstArg, cred1.credentialID);
      });

      t.test("performs sign-in", async (t) => {
        const user1 = testUser1();
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        getRegisterableStub.returns({ source: {} });
        const user = {};
        registerUserStub.resolves(user);
        fetchCredentialByIdStub.resolves({
          ...cred1,
          created: testNowDate,
          user: user1,
        });

        const { app } = createAttestationTestExpressApp(t);
        await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {
            transports: ["internal"],
          },
        });

        t.ok(signInStub.called);
        verifyRequest(t, signInStub.firstCall.args[0], {
          url: "/result",
          method: "POST",
        });
        t.same(signInStub.firstCall.args[1], {
          ...cred1,
          created: testNowDate,
          user: user1,
        });
      });
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        const cred1 = testCredential1();
        getRegistrationStub.returns(testRegistration);
        verifyRegistrationResponseStub.returns({
          registrationInfo: { ...testValidatedCredential },
        });
        getRegisterableStub.returns({ source: {} });
        fetchCredentialByIdStub.resolves({
          ...cred1,
          created: testNowDate,
          user: testUser1(),
        });
        signInStub.returns("/foo");

        const { app } = createAttestationTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
          response: {},
        });

        verifyFido2SuccessResponse(t, response, {
          return_to: "/foo",
        });
      }
    );
  });
});
