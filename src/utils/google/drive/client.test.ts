import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const mockGoogleAuthConstructorFake = sinon.fake();
class MockGoogleAuth {
  constructor(options: any) {
    mockGoogleAuthConstructorFake(options);
    this.isMock = true;
  }

  isMock: boolean;
}

const driveMock = {};
const driveFake = sinon.fake.returns(driveMock);

// helpers

function importModule(t: Test) {
  return t.mockRequire("./client", {
    // FIX: for some reason this mock makes this test file run very slow
    "@googleapis/drive": {
      drive: driveFake,
    },
    "google-auth-library": {
      GoogleAuth: MockGoogleAuth,
    },
    "../../config": {
      googleAuthClientEmail: "foo@example.com",
      googleAuthPrivateKey: "google-auth-private-key",
    },
  });
}

t.test("utils/google/drive/client", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("drive", async (t) => {
    let drive: any;

    t.beforeEach(async () => {
      drive = importModule(t).drive;
    });

    t.test("creates a GoogleAuth instance with expected options", async (t) => {
      t.ok(mockGoogleAuthConstructorFake.called);
      t.same(mockGoogleAuthConstructorFake.firstCall.firstArg, {
        credentials: {
          client_email: "foo@example.com",
          private_key: "google-auth-private-key",
        },
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
    });

    t.test("calls the Google drive factory with expected config", async (t) => {
      t.ok(driveFake.called);
      t.equal(driveFake.firstCall.firstArg.version, "v3");
      t.ok(driveFake.firstCall.firstArg.auth.isMock);
    });

    t.test("is the result of the Google drive factory function", async (t) => {
      t.equal(drive, driveMock);
    });
  });
});
