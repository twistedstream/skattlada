import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const logger = {
  info: sinon.fake(),
};

const testMetadata = {
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
};

// helpers

function importModule(t: Test) {
  const { BaseMetadataProvider } = t.mockRequire("./base", {
    // just to suppress log messages
    "../../utils/logger": { logger },
  });

  return t.mockRequire("./local", {
    "./base": { BaseMetadataProvider },
    "./test-metadata.json": testMetadata,
  });
}

// tests

t.test("data/metadata-providers/local", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("instance methods", async (t) => {
    function createInstance(): any {
      const { LocalMetadataProvider } = importModule(t);
      return new LocalMetadataProvider();
    }

    t.test("loadStatements", async (t) => {
      t.test(
        "loads data from the local file, converts it, and returns the expected statements list",
        async (t) => {
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
