import sinon from "sinon";
import { test } from "tap";

// test objects

const logger = {
  info: sinon.fake(),
};

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./base", {
    "../../utils/logger": { logger },
  });
}

// tests

test("data/metadata-providers/base", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("instance methods", async (t) => {
    const statement1 = { aaguid: "aaguid1" };
    const statement2 = { aaguid: "aaguid2" };
    const statement3 = { aaguid: "aaguid3" };

    function createInstance(): any {
      const { BaseMetadataProvider } = importModule(t);
      return new BaseMetadataProvider();
    }

    t.test("initialize", async (t) => {
      t.test("loads statement list from the subclass", async (t) => {
        const target = createInstance();
        const loadStatementsStub = sinon.stub(target, "loadStatements");

        try {
          await target.initialize();
        } catch {}

        t.ok(loadStatementsStub.called);
        t.equal(loadStatementsStub.firstCall.args.length, 0);
      });

      t.test("converts statements into expected dictionary", async (t) => {
        const target = createInstance();
        sinon
          .stub(target, "loadStatements")
          .resolves([statement1, statement2, statement3]);

        await target.initialize();

        const statements = target.getStatements();
        const keys = Object.keys(statements);
        t.same(keys, ["aaguid1", "aaguid2", "aaguid3"]);
        t.equal(statements.aaguid1, statement1);
        t.equal(statements.aaguid2, statement2);
        t.equal(statements.aaguid3, statement3);
      });

      t.test("logs how many statements were loaded", async (t) => {
        const target = createInstance();
        sinon
          .stub(target, "loadStatements")
          .resolves([statement1, statement2, statement3]);

        await target.initialize();

        t.ok(logger.info.called);
        t.equal(
          logger.info.firstCall.firstArg,
          "Metadata provider loaded 3 statement(s)"
        );
      });
    });

    t.test("getStatements", async (t) => {
      t.test(
        "if initialize hasn't been called, throws expected error",
        async (t) => {
          const target = createInstance();

          t.throws(() => target.getStatements(), {
            message: "Provider not initialized",
          });
        }
      );

      t.test("returns expected statements dictionary", async (t) => {
        const target = createInstance();
        const statements = {};
        target.statements = statements;

        const result = target.getStatements();

        t.equal(result, statements);
      });
    });
  });
});
