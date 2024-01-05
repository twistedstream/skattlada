import { omit } from "lodash";
import sinon from "sinon";
import { test } from "tap";

import { RowData } from "../../../types/table";
import { testCredential2, testUser2 } from "../../../utils/testing/data";

// test objects

const credential = testCredential2();
const user = testUser2();

const row: RowData = {
  id: credential.credentialID,
  created: "2023-03-01T00:00:00.000Z",
  public_key: credential.credentialPublicKey,
  counter: 42,
  aaguid: "AUTH_GUID_2",
  device_type: "singleDevice",
  is_backed_up: false,
  transports: "usb,nfc",
  user_id: user.id,
};

const rowToUserFake = sinon.fake.returns(user);

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./credential", {
    "./user": {
      rowToUser: rowToUserFake,
    },
  });
}

test("data/data-providers/google-sheets/credential", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("rowToCredential", async (t) => {
    const { rowToCredential } = importModule(t);

    t.test("converts user row to user object", async (t) => {
      const userRow = {};

      try {
        rowToCredential(row, userRow);
      } catch {}

      t.ok(rowToUserFake.called);
      t.equal(rowToUserFake.firstCall.firstArg, userRow);
    });

    t.test("returns expected credential", async (t) => {
      t.test("with transports", async (t) => {
        const result = rowToCredential(row);

        t.same(omit(result, "user"), omit(credential));
        t.equal(result.user, user);
      });

      t.test("without transports", async (t) => {
        const result = rowToCredential(omit(row, "transports"));

        t.same(
          omit(result, "user", "transports"),
          omit(credential, "transports")
        );
        t.equal(result.transports, undefined);
      });
    });
  });

  t.test("credentialToRow", async (t) => {
    const { credentialToRow } = importModule(t);

    t.test("returns expected row", async (t) => {
      t.test("with transports", async (t) => {
        const result = credentialToRow(credential, user.id);

        t.same(result, row);
      });

      t.test("without transports", async (t) => {
        const result = credentialToRow(omit(credential, "transports"), user.id);

        t.same(omit(result, "transports"), omit(row, "transports"));
        t.equal(result.transports, undefined);
      });
    });
  });
});
