import sinon from "sinon";
import { test } from "tap";

// test objects

const logger = {
  info: sinon.fake(),
};

const localTestMetadata = {
  aaguid1: {
    name: "Authenticator 1",
    icon_light: "icon-data-1",
  },
  aaguid2: {
    name: "Authenticator 2",
    icon_light: "icon-data-2",
  },
};

const remoteTestMetadata = {
  aaguid3: {
    name: "Authenticator 3",
    icon_light: "icon-data-3",
  },
  aaguid4: {
    name: "Authenticator 4",
    icon_light: "icon-data-4",
  },
};

const fetchFake = sinon.fake.resolves({
  json: sinon.fake.resolves(remoteTestMetadata),
});
global.fetch = fetchFake;

// helpers

function importModule(test: Tap.Test, metadataUrl?: string) {
  return test.mock("./index", {
    "../../utils/logger": {
      logger,
    },
    "../../utils/config": {
      metadataUrl,
    },
    "./test-metadata.json": localTestMetadata,
  });
}

// tests

test("services/metadata/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("loadMetadata", async (t) => {
    let loadMetadata: any;
    let findMetadata: any;

    t.test("when metadataUrl config is not set", async (t) => {
      t.beforeEach(async () => {
        const module = importModule(t);
        loadMetadata = module.loadMetadata;
        findMetadata = module.findMetadata;
      });

      t.test("does not perform fetch", async (t) => {
        try {
          await loadMetadata();
        } catch {}

        t.notOk(fetchFake.called);
      });

      t.test("loads the expected metadata statements", async (t) => {
        await loadMetadata();

        t.same(findMetadata("aaguid1"), {
          aaguid: "aaguid1",
          description: localTestMetadata.aaguid1.name,
          icon: localTestMetadata.aaguid1.icon_light,
        });
        t.same(findMetadata("aaguid2"), {
          aaguid: "aaguid2",
          description: localTestMetadata.aaguid2.name,
          icon: localTestMetadata.aaguid2.icon_light,
        });
      });

      t.test("logs expected message", async (t) => {
        try {
          await loadMetadata();
        } catch {}

        t.ok(logger.info.called);
        t.equal(
          logger.info.firstCall.firstArg,
          "Loaded 2 metadata statement(s) from: ./test-metadata.json"
        );
      });
    });

    t.test("when metadataUrl config is set", async (t) => {
      t.beforeEach(async () => {
        const module = importModule(t, "https://example.com/metadata.json");
        loadMetadata = module.loadMetadata;
        findMetadata = module.findMetadata;
      });

      t.test("performs fetch", async (t) => {
        try {
          await loadMetadata();
        } catch {}

        t.ok(fetchFake.called);
      });

      t.test("loads the expected metadata statements", async (t) => {
        await loadMetadata();

        t.same(findMetadata("aaguid3"), {
          aaguid: "aaguid3",
          description: remoteTestMetadata.aaguid3.name,
          icon: remoteTestMetadata.aaguid3.icon_light,
        });
        t.same(findMetadata("aaguid4"), {
          aaguid: "aaguid4",
          description: remoteTestMetadata.aaguid4.name,
          icon: remoteTestMetadata.aaguid4.icon_light,
        });
      });

      t.test("logs expected message", async (t) => {
        try {
          await loadMetadata();
        } catch {}

        t.ok(logger.info.called);
        t.equal(
          logger.info.firstCall.firstArg,
          "Loaded 2 metadata statement(s) from: https://example.com/metadata.json"
        );
      });
    });
  });

  t.test("findMetadata", async (t) => {
    let loadMetadata: any;
    let findMetadata: any;

    t.beforeEach(async () => {
      const module = importModule(t);
      loadMetadata = module.loadMetadata;
      findMetadata = module.findMetadata;
    });

    t.test(
      "if metadata hasn't been loaded, throws expected error",
      async (t) => {
        t.throws(() => findMetadata("aaguid1"), {
          message: "Metadata statements have not been loaded",
        });
      }
    );

    t.test("returns expected statement", async (t) => {
      await loadMetadata();

      const result = findMetadata("aaguid1");
      t.same(result, {
        aaguid: "aaguid1",
        description: localTestMetadata.aaguid1.name,
        icon: localTestMetadata.aaguid1.icon_light,
      });
    });
  });
});
