import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const metadataProvider = {
  getStatements: sinon.stub(),
};

// helpers

function importModule(t: Test) {
  return t.mockRequire("./metadata", {
    "../data": {
      getMetadataProvider: () => metadataProvider,
    },
  });
}

// tests

t.test("services/metadata", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fetchMetadataById", async (t) => {
    let fetchMetadataById: any;

    t.beforeEach(async () => {
      fetchMetadataById = importModule(t).fetchMetadataById;
    });

    t.test("gets metadata statements from the provider", async (t) => {
      try {
        fetchMetadataById("aaguid1");
      } catch {}

      t.ok(metadataProvider.getStatements.called);
      t.equal(metadataProvider.getStatements.firstCall.args.length, 0);
    });

    t.test("returns the specified metadata statement by AAGUID", async (t) => {
      const statement1 = {};
      const statement2 = {};
      const statements = {
        aaguid1: statement1,
        aaguid2: statement2,
      };
      metadataProvider.getStatements.returns(statements);

      const result = fetchMetadataById("aaguid1");

      t.equal(result, statement1);
    });
  });
});
