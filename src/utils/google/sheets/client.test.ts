import sinon from "sinon";
import { test } from "tap";

// test objects

const sheetsMock = {};
const sheetsFake = sinon.fake.returns(sheetsMock);
const authMock = {};
const buildAuthFake = sinon.fake.returns(authMock);

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./client", {
    // FIX: for some reason this mock makes this test file run very slow
    "@googleapis/sheets": {
      sheets: sheetsFake,
    },
    "../auth": {
      buildAuth: buildAuthFake,
    },
  });
}

test("utils/google/sheets/client", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("sheets", async (t) => {
    let sheets: any;

    t.beforeEach(async () => {
      sheets = importModule(t).sheets;
    });

    t.test(
      "is obtained by calling the Google sheets factory function",
      async (t) => {
        t.equal(sheets, sheetsMock);
      }
    );

    t.test("builds the Google auth object with expected scopes", async (t) => {
      t.ok(buildAuthFake.called);
      t.same(buildAuthFake.firstCall.firstArg, [
        "https://www.googleapis.com/auth/spreadsheets",
      ]);
    });

    t.test(
      "calls the Google sheets factory with expected config",
      async (t) => {
        t.ok(sheetsFake.called);
        t.equal(sheetsFake.firstCall.firstArg.version, "v4");
        t.equal(sheetsFake.firstCall.firstArg.auth, authMock);
      }
    );
  });
});
