import sinon from "sinon";
import { test } from "tap";

// test objects

const driveMock = {};
const driveFake = sinon.fake.returns(driveMock);
const authMock = {};
const buildAuthFake = sinon.fake.returns(authMock);

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./client", {
    // FIX: for some reason this mock makes this test file run very slow
    "@googleapis/drive": {
      drive: driveFake,
    },
    "../auth": {
      buildAuth: buildAuthFake,
    },
  });
}

test("utils/google/drive/client", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("drive", async (t) => {
    let drive: any;

    t.beforeEach(async () => {
      drive = importModule(t).drive;
    });

    t.test(
      "is obtained by calling the Google drive factory function",
      async (t) => {
        t.equal(drive, driveMock);
      }
    );

    t.test("builds the Google auth object with expected scopes", async (t) => {
      t.ok(buildAuthFake.called);
      t.same(buildAuthFake.firstCall.firstArg, [
        "https://www.googleapis.com/auth/drive.readonly",
      ]);
    });

    t.test("calls the Google drive factory with expected config", async (t) => {
      t.ok(driveFake.called);
      t.equal(driveFake.firstCall.firstArg.version, "v3");
      t.equal(driveFake.firstCall.firstArg.auth, authMock);
    });
  });
});
