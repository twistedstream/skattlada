import sinon from "sinon";
import { test } from "tap";

// test objects

const logger = {
  info: sinon.fake(),
};

const jsonStub = sinon.stub();
const fetchFake = sinon.fake.resolves({
  json: jsonStub,
});
global.fetch = fetchFake;

// helpers

function importModule(test: Tap.Test) {
  const { BaseMetadataProvider } = test.mock("./base", {
    // just to suppress log messages
    "../../utils/logger": { logger },
  });

  return test.mock("./passkey-authenticator-aaguids", {
    "./base": { BaseMetadataProvider },
  });
}

// tests

test("data/metadata-providers/remote", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("instance methods", async (t) => {
    function createInstance(): any {
      const { PasskeyProviderAaguidsMetadataProvider } = importModule(t);
      return new PasskeyProviderAaguidsMetadataProvider();
    }

    t.test("loadStatements", async (t) => {
      t.test(
        "fetches data from the passkeydeveloper/passkey-authenticator-aaguids URL",
        async (t) => {
          const target = createInstance();

          try {
            await target.loadStatements();
          } catch {}

          t.ok(fetchFake.called);
          t.equal(
            fetchFake.firstCall.args[0],
            "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json",
          );
          t.same(fetchFake.firstCall.args[1], { method: "GET" });
          t.ok(jsonStub.called);
          t.equal(jsonStub.firstCall.args.length, 0);
        },
      );

      t.test(
        "converts the data and returns the expected statements list",
        async (t) => {
          jsonStub.resolves({
            aaguid1: {
              name: "Authenticator 1",
              icon_light: "icon-data-1",
            },
            aaguid2: {
              name: "Authenticator 2",
              icon_light: "icon-data-2",
            },
            aaguid3: {
              name: "Authenticator 3",
              icon_light: "icon-data-3",
            },
          });
          const target = createInstance();

          const result = await target.loadStatements();

          t.same(result, [
            {
              aaguid: "aaguid1",
              description: "Authenticator 1",
              icon: "icon-data-1",
            },
            {
              aaguid: "aaguid2",
              description: "Authenticator 2",
              icon: "icon-data-2",
            },
            {
              aaguid: "aaguid3",
              description: "Authenticator 3",
              icon: "icon-data-3",
            },
          ]);
        },
      );
    });
  });
});
