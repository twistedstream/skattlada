import sinon from "sinon";
import { test } from "tap";

import {
  testCredential1,
  testCredential2,
  testUser1,
} from "../../utils/testing/data";

// test objects

const fetchCredentialsByUserIdStub = sinon.stub();
const fetchMetadataByIdStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./view", {
    "../../services/user": {
      fetchCredentialsByUserId: fetchCredentialsByUserIdStub,
    },
    "../../services/metadata": {
      fetchMetadataById: fetchMetadataByIdStub,
    },
  });
}

// tests

test("routes/profile/view", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("buildViewData", async (t) => {
    let buildViewData: any;

    t.beforeEach(async () => {
      buildViewData = importModule(t).buildViewData;
    });

    t.test("fetches credentials by user ID", async (t) => {
      try {
        await buildViewData({ id: "USER1" });
      } catch {}

      t.ok(fetchCredentialsByUserIdStub.called);
      t.equal(fetchCredentialsByUserIdStub.firstCall.firstArg, "USER1");
    });

    t.test(
      "fetches authenticator metadata and returns expected view data",
      async (t) => {
        const user1 = testUser1();
        const credential1 = testCredential1();
        const credential2 = testCredential2();
        const csrf_token = "CSRF_TOKEN";
        fetchCredentialsByUserIdStub.resolves([credential1, credential2]);
        fetchMetadataByIdStub.withArgs(credential1.aaguid).returns({
          description: "Authenticator 1",
          icon: "icon-data-1",
        });
        fetchMetadataByIdStub.withArgs(credential2.aaguid).returns(undefined);

        const result = await buildViewData(user1, credential2, csrf_token);

        t.ok(result);
        t.same(result, {
          csrf_token,
          username: user1.username,
          display_name: user1.displayName,
          is_admin: user1.isAdmin,
          passkeys: {
            active: {
              id: credential2.credentialID,
              description: "(unknown)",
              is_synced: false,
              icon: undefined,
              created: credential2.created.toISO(),
            },
            others: [
              {
                id: credential1.credentialID,
                description: "Authenticator 1",
                is_synced: true,
                icon: "icon-data-1",
                created: credential1.created.toISO(),
              },
            ],
          },
        });
      },
    );
  });
});
