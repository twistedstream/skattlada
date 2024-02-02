import { test } from "tap";

import { RowData } from "google-sheets-table";
import sinon from "sinon";
import { testUser2 } from "../../../utils/testing/data";

// test objects

const user = testUser2();

const row: RowData = {
  id: user.id,
  created: "2023-04-01T00:00:00.000Z",
  username: "jim",
  display_name: "Jim User",
  is_admin: true,
};

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./user", {});
}

test("data/data-providers/google-sheets/user", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("rowToUser", async (t) => {
    const { rowToUser } = importModule(t);

    t.test("returns expected user", async (t) => {
      const result = rowToUser(row);

      t.same(result, user);
    });
  });

  t.test("userToRow", async (t) => {
    const { userToRow } = importModule(t);

    t.test("returns expected row", async (t) => {
      const result = userToRow(user);

      t.same(result, row);
    });
  });
});
