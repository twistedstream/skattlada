import { Duration } from "luxon";
import { test } from "tap";

// helpers
function importModule(test: Tap.Test) {
  return test.mock("./config", {
    "../../package.json": {
      name: "test-package",
      description: "Test Package",
      version: "42.0",
    },
  });
}

test("utils/config", async (t) => {
  t.test("exports expected values", async (t) => {
    const config = importModule(t);

    [
      { name: "port", value: 4242 },
      { name: "environment", value: "test" },
      { name: "logLevel", value: "debug" },
      { name: "rpID", value: "example.com" },
      { name: "rpName", value: "Example" },
      { name: "baseUrl", value: "http://example.com:4242" },
      { name: "cookieSecret", value: "Bananas!" },
      { name: "csrfSecret", value: "Bananas?" },
      { name: "maxInviteLifetime", value: Duration.fromISO("P2D") },
      { name: "dataProviderName", value: "in-memory" },
      { name: "googleSpreadsheetId", value: "google-provider-spreadsheet-id" },
      { name: "fileProviderName", value: "local" },
      { name: "googleAuthClientEmail", value: "google-client@example.com" },
      { name: "packageName", value: "test-package" },
      { name: "packageDescription", value: "Test Package" },
      { name: "packageVersion", value: "42.0" },
      { name: "metadataUrl", value: "https://example.com/metadata.json" },
    ].forEach((item) => {
      t.same(config[item.name], item.value, item.name);
    });
  });

  t.test("googleAuthPrivateKey", async (t) => {
    t.test("using GOOGLE_AUTH_PRIVATE_KEY", async (t) => {
      const { googleAuthPrivateKey } = importModule(t);

      t.test("is expected value", async (t) => {
        t.equal(googleAuthPrivateKey, "google_Bananas!");
      });
    });

    t.test("using GOOGLE_AUTH_PRIVATE_KEY_BASE64", async (t) => {
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;
      process.env.GOOGLE_AUTH_PRIVATE_KEY_BASE64 = "Z29vZ2xlX0JhbmFuYXMh";
      const { googleAuthPrivateKey } = importModule(t);

      t.test("is expected value", async (t) => {
        t.equal(googleAuthPrivateKey, "google_Bananas!");
      });
    });

    t.test("when no env vars are set", async (t) => {
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY_BASE64;
      const { googleAuthPrivateKey } = importModule(t);

      t.test("is expected value", async (t) => {
        t.equal(googleAuthPrivateKey, undefined);
      });
    });
  });
});
