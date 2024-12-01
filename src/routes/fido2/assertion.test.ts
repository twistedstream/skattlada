import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { Express } from "express";
import sinon from "sinon";
import request, {
  Test as SuperTest,
  Response as SupertestResponse,
} from "supertest";
import { t, Test } from "tap";

import { StatusCodes } from "http-status-codes";
import { testCredential1, testUser1 } from "../../utils/testing/data";
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

type AssertionTestExpressAppOptions = {
  withAuth?: boolean;
  suppressErrorOutput?: boolean;
};

// test objects

const expressRouter = {
  post: sinon.fake(),
};
const routerFake = sinon.fake.returns(expressRouter);
const logger = {
  debug: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
};
const fetchUserByNameStub = sinon.stub();
const fetchCredentialsByUsernameStub = sinon.stub();
const generateAuthenticationOptionsStub = sinon.stub();
const beginSignInFake = sinon.fake();
const getAuthenticationStub = sinon.stub();
const fetchCredentialByIdStub = sinon.stub();
const fetchUserByIdStub = sinon.stub();
const verifyAuthenticationResponseStub = sinon.stub();
const signInStub = sinon.stub();

// helpers

function importModule(
  t: Test,
  { mockExpress = false, mockModules = false }: MockOptions = {},
) {
  const { default: router } = t.mockRequire("./assertion", {
    ...(mockExpress && {
      express: {
        Router: routerFake,
      },
    }),
    ...(mockModules && {
      "../../utils/logger": { logger },
      "../../services/user": {
        fetchUserByName: fetchUserByNameStub,
        fetchCredentialsByUsername: fetchCredentialsByUsernameStub,
        fetchCredentialById: fetchCredentialByIdStub,
        fetchUserById: fetchUserByIdStub,
      },
      "@simplewebauthn/server": {
        generateAuthenticationOptions: generateAuthenticationOptionsStub,
        verifyAuthenticationResponse: verifyAuthenticationResponseStub,
      },
      "../../utils/config": {
        baseUrl: "https://example.com",
        rpID: "example.com",
      },
      "../../utils/auth": {
        beginSignIn: beginSignInFake,
        getAuthentication: getAuthenticationStub,
        signIn: signInStub,
      },
    }),
  });

  return router;
}

function createAssertionTestExpressApp(
  t: Test,
  { withAuth, suppressErrorOutput }: AssertionTestExpressAppOptions = {},
) {
  const router = importModule(t, { mockModules: true });

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
      test: t,
      modulePath: "../../routes/fido2/error-handler",
      suppressErrorOutput,
    },
  });
}

function verifyFailedAuthenticationFido2ErrorResponse(
  t: Test,
  response: SupertestResponse,
) {
  verifyUserErrorFido2ServerResponse(
    t,
    response,
    StatusCodes.BAD_REQUEST,
    "We couldn't sign you in",
  );
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

t.test("routes/fido2/assertion", async (t) => {
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
      ["/options", "/result"],
    );
  });

  t.test("POST /options", async (t) => {
    t.test("if username is passed in the request", async (t) => {
      t.test("fetches user with trimmed username", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([testCredential1()]);

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "   bob ",
        });

        t.ok(fetchUserByNameStub.called);
        t.same(fetchUserByNameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if user doesn't exist, renders JSON with expected user error",
        async (t) => {
          fetchUserByNameStub.resolves();

          const { app } = createAssertionTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyFailedAuthenticationFido2ErrorResponse(t, response);
          // test for warning log message
          t.ok(logger.warn.called);
          t.match(
            logger.warn.firstCall.firstArg,
            "No such user with name 'bob'",
          );
        },
      );

      t.test("fetches user's credentials with trimmed username", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([testCredential1()]);

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "   bob ",
        });

        t.ok(fetchCredentialsByUsernameStub.called);
        t.same(fetchCredentialsByUsernameStub.firstCall.firstArg, "bob");
      });

      t.test(
        "if credentials aren't found, renders JSON with expected server error",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([]);

          const { app } = createAssertionTestExpressApp(t, {
            suppressErrorOutput: true,
          });
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyServerErrorFido2ServerResponse(
            t,
            response,
            StatusCodes.INTERNAL_SERVER_ERROR,
          );
        },
      );
    });

    t.test("does not fetch user or credentials", async (t) => {
      t.test("if no username is in request", async (t) => {
        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({});

        t.notOk(fetchUserByNameStub.called);
        t.notOk(fetchCredentialsByUsernameStub.called);
      });

      t.test("if trimmed username is empty", async (t) => {
        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({ username: "  " });

        t.notOk(fetchUserByNameStub.called);
        t.notOk(fetchCredentialsByUsernameStub.called);
      });
    });

    t.test("generates authentication options", async (t) => {
      t.test("with expected allowed credentials", async (t) => {
        const cred1 = testCredential1();
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([cred1]);
        generateAuthenticationOptionsStub.resolves({});

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(generateAuthenticationOptionsStub.called);
        t.same(
          generateAuthenticationOptionsStub.firstCall.args[0].allowCredentials,
          [
            {
              id: isoBase64URL.toBuffer(cred1.credentialID),
              type: "public-key",
              transports: cred1.transports ? [...cred1.transports] : [],
            },
          ],
        );
      });

      t.test(
        "with expected user verification passed in the request",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([testCredential1()]);
          generateAuthenticationOptionsStub.resolves({});

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
            userVerification: "required",
          });

          t.ok(generateAuthenticationOptionsStub.called);
          t.equal(
            generateAuthenticationOptionsStub.firstCall.args[0]
              .userVerification,
            "required",
          );
        },
      );

      t.test("with expected default user verification", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([testCredential1()]);
        generateAuthenticationOptionsStub.resolves({});

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(generateAuthenticationOptionsStub.called);
        t.equal(
          generateAuthenticationOptionsStub.firstCall.args[0].userVerification,
          "preferred",
        );
      });
    });

    t.test("begins sign in", async (t) => {
      t.test(
        "with expected request, challenge, and existing user",
        async (t) => {
          const existingUser = {};
          fetchUserByNameStub.resolves(existingUser);
          fetchCredentialsByUsernameStub.resolves([testCredential1()]);
          generateAuthenticationOptionsStub.resolves({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
          });

          t.ok(beginSignInFake.called);
          verifyRequest(t, beginSignInFake.firstCall.args[0], {
            url: "/options",
            method: "POST",
          });
          t.equal(beginSignInFake.firstCall.args[1], "CHALLENGE!");
          t.equal(beginSignInFake.firstCall.args[2], existingUser);
        },
      );

      t.test(
        "with expected user verification passed in the request",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([testCredential1()]);
          generateAuthenticationOptionsStub.resolves({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t);
          await performOptionsPostRequest(app).send({
            username: "bob",
            userVerification: "required",
          });

          t.ok(beginSignInFake.called);
          t.equal(beginSignInFake.firstCall.args[3], "required");
        },
      );

      t.test("with expected default user verification", async (t) => {
        fetchUserByNameStub.resolves({});
        fetchCredentialsByUsernameStub.resolves([testCredential1()]);
        generateAuthenticationOptionsStub.resolves({
          challenge: "CHALLENGE!",
        });

        const { app } = createAssertionTestExpressApp(t);
        await performOptionsPostRequest(app).send({
          username: "bob",
        });

        t.ok(beginSignInFake.called);
        t.equal(beginSignInFake.firstCall.args[3], "preferred");
      });
    });

    t.test("when successful", async (t) => {
      t.test(
        "if no existing session, renders JSON with expected options data",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([testCredential1()]);
          generateAuthenticationOptionsStub.resolves({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t);
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyFido2SuccessResponse(t, response, {
            challenge: "CHALLENGE!",
          });
        },
      );

      t.test(
        "if existing session, renders JSON with expected options data",
        async (t) => {
          fetchUserByNameStub.resolves({});
          fetchCredentialsByUsernameStub.resolves([testCredential1()]);
          generateAuthenticationOptionsStub.resolves({
            challenge: "CHALLENGE!",
          });

          const { app } = createAssertionTestExpressApp(t, { withAuth: true });
          const response = await performOptionsPostRequest(app).send({
            username: "bob",
          });

          verifyFido2SuccessResponse(t, response, {
            challenge: "CHALLENGE!",
          });
        },
      );
    });
  });

  t.test("POST /result", async (t) => {
    t.test(
      "if credential ID is missing from request, renders JSON with expected user error",
      async (t) => {
        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          response: {},
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "Missing: credential ID",
        );
      },
    );

    t.test("gets the authentication state", async (t) => {
      const cred1 = testCredential1();
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({
        ...cred1,
        user: testUser1(),
      });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
      });

      t.ok(getAuthenticationStub.called);
      verifyRequest(t, getAuthenticationStub.firstCall.firstArg, {
        url: "/result",
        method: "POST",
      });
    });

    t.test(
      "if authentication state is missing, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        getAuthenticationStub.returns(undefined);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyUserErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.BAD_REQUEST,
          "No active authentication",
        );
      },
    );

    t.test("fetches active credential by ID", async (t) => {
      const cred1 = testCredential1();
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({
        ...cred1,
        user: testUser1(),
      });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
      });

      t.ok(fetchCredentialByIdStub.called);
      t.equal(fetchCredentialByIdStub.firstCall.firstArg, cred1.credentialID);
    });

    t.test(
      "if active credential doesn't exist, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves(undefined);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.match(
          logger.warn.firstCall.firstArg,
          "No credential found with ID " + cred1.credentialID,
        );
      },
    );

    t.test(
      "if found credential's user doesn't match the authentication state's user, renders JSON with expected user error",
      async (t) => {
        const cred1 = testCredential1();
        getAuthenticationStub.returns({
          authenticatingUser: { id: "321cba" },
        });
        fetchCredentialByIdStub.resolves({
          ...cred1,
          user: testUser1(),
        });

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.match(
          logger.warn.firstCall.firstArg,
          "Presented credential (id = " +
            cred1.credentialID +
            ") is not associated with specified user (id = 321cba)",
        );
      },
    );

    t.test("fetches matching existing user", async (t) => {
      const user1 = testUser1();
      const cred1 = testCredential1();
      getAuthenticationStub.returns({});
      fetchCredentialByIdStub.resolves({
        ...cred1,
        user: user1,
      });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
      });

      t.ok(fetchUserByIdStub.called);
      t.equal(fetchUserByIdStub.firstCall.firstArg, user1.id);
    });

    t.test(
      "if no matching existing user is found, renders JSON with expected server error",
      async (t) => {
        const cred1 = testCredential1();
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({
          ...cred1,
          user: testUser1(),
        });
        fetchUserByIdStub.resolves(undefined);

        const { app } = createAssertionTestExpressApp(t, {
          suppressErrorOutput: true,
        });
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyServerErrorFido2ServerResponse(
          t,
          response,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      },
    );

    t.test("verifies authentication response", async (t) => {
      const user1 = testUser1();
      const cred1 = testCredential1();
      getAuthenticationStub.returns({
        challenge: "CHALLENGE!",
      });
      fetchCredentialByIdStub.resolves({
        ...cred1,
        user: user1,
      });
      fetchUserByIdStub.resolves({});

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
      });

      t.ok(verifyAuthenticationResponseStub.called);
      t.same(verifyAuthenticationResponseStub.firstCall.firstArg, {
        response: {
          id: cred1.credentialID,
        },
        expectedChallenge: "CHALLENGE!",
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
        authenticator: {
          ...cred1,
          credentialID: isoBase64URL.toBuffer(cred1.credentialID),
          credentialPublicKey: isoBase64URL.toBuffer(cred1.credentialPublicKey),
          user: user1,
        },
      });
    });

    t.test(
      "if authentication response verification fails, renders JSON with expected user error",
      async (t) => {
        const user1 = testUser1();
        const cred1 = testCredential1();
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({
          ...cred1,
          user: user1,
        });
        fetchUserByIdStub.resolves(user1);
        const err = new Error("PKI sez nope");
        verifyAuthenticationResponseStub.throws(err);

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyFailedAuthenticationFido2ErrorResponse(t, response);
        // test for warning log message
        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], err);
        t.match(
          logger.warn.firstCall.args[1],
          "Authentication error with user (id = " +
            user1.id +
            ") and credential (id = " +
            cred1.credentialID +
            ")",
        );
      },
    );

    t.test("performs sign in", async (t) => {
      const user1 = testUser1();
      const cred1 = testCredential1();
      getAuthenticationStub.returns({});
      const activeCredential = { ...cred1, user: user1 };
      fetchCredentialByIdStub.resolves(activeCredential);
      fetchUserByIdStub.resolves(user1);

      const { app } = createAssertionTestExpressApp(t);
      await performResultPostRequest(app).send({
        id: cred1.credentialID,
      });

      t.ok(signInStub.called);
      verifyRequest(t, signInStub.firstCall.args[0], {
        url: "/result",
        method: "POST",
      });
      t.equal(signInStub.firstCall.args[1], activeCredential);
    });

    t.test(
      "if successful, renders JSON with expected options data",
      async (t) => {
        const cred1 = testCredential1();
        getAuthenticationStub.returns({});
        fetchCredentialByIdStub.resolves({
          ...cred1,
          user: testUser1(),
        });
        fetchUserByIdStub.resolves({});
        signInStub.returns("/foo");

        const { app } = createAssertionTestExpressApp(t);
        const response = await performResultPostRequest(app).send({
          id: cred1.credentialID,
        });

        verifyFido2SuccessResponse(t, response, {
          return_to: "/foo",
        });
      },
    );
  });
});
