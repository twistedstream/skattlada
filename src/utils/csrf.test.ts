import sinon from "sinon";
import { test } from "tap";

// test objects

const generateToken = () => {};
const doubleCsrfProtection = () => {};
const doubleCsrfFake = sinon.fake.returns({
  generateToken,
  doubleCsrfProtection,
});
const csrfSecret = "Bananas?";

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./csrf", {
    "csrf-csrf": {
      doubleCsrf: doubleCsrfFake,
    },
    "./config": {
      csrfSecret,
    },
  });
}

test("utils/csrf", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("creates CSRF utilities with expected options", async (t) => {
    importModule(t);

    t.ok(doubleCsrfFake.called);
    const { getSecret, getTokenFromRequest, cookieOptions } =
      doubleCsrfFake.firstCall.firstArg;
    t.equal(getSecret(), csrfSecret, "expected csrf secret");
    const token = getTokenFromRequest({ body: { csrf_token: "CSRF_TOKEN" } });
    t.equal(token, "CSRF_TOKEN", "expected token fetching function");
    t.same(cookieOptions, { maxAge: 86400000 }, "expected cookie options");
  });

  t.test("generateCsrfToken", async (t) => {
    const { generateCsrfToken } = importModule(t);

    t.test(
      "is a function that is the generateToken utility function",
      async (t) => {
        t.equal(generateCsrfToken, generateToken);
      },
    );
  });

  t.test("validateCsrfToken", async (t) => {
    const { validateCsrfToken } = importModule(t);

    t.test(
      "is a function that returns the doubleCsrfProtection middleware",
      async (t) => {
        const result = validateCsrfToken();
        t.equal(result, doubleCsrfProtection);
      },
    );
  });
});
