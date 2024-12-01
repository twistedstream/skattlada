import { omit } from "lodash";
import sinon from "sinon";
import { t, Test } from "tap";

import { RowData } from "google-sheets-table";
import { testInvite1, testUser1, testUser2 } from "../../../utils/testing/data";

// test objects

const createdByUser = testUser2();
const claimedByUser = testUser1();
const unclaimedInvite = testInvite1(createdByUser);
const claimedInvite = testInvite1(createdByUser, claimedByUser);

const unclaimedInviteRow: RowData = {
  id: "INVITE_1",
  created: "2023-01-01T00:00:00.000Z",
  created_by: createdByUser.id,
  is_admin: true,
};
const claimedInviteRow: RowData = {
  ...unclaimedInviteRow,
  claimed: "2023-01-02T00:00:00.000Z",
  claimed_by: claimedByUser.id,
};

const rowToUserStub = sinon.stub();
const userToRowStub = sinon.stub();

// helpers

function importModule(t: Test) {
  return t.mockRequire("./invite", {
    "./user": {
      rowToUser: rowToUserStub,
      userToRow: userToRowStub,
    },
  });
}

t.test("data/data-providers/google-sheets/invite", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("rowToInvite", async (t) => {
    const { rowToInvite } = importModule(t);

    t.test("when unclaimed", async (t) => {
      const createdByRow = {};

      t.test("converts created by user row to user object", async (t) => {
        try {
          rowToInvite(unclaimedInviteRow, createdByRow, undefined);
        } catch {}

        t.ok(rowToUserStub.called);
        const calls = rowToUserStub.getCalls();
        t.equal(calls.length, 1);
        t.equal(calls[0].firstArg, createdByRow);
      });

      t.test("returns expected invite", async (t) => {
        rowToUserStub.onFirstCall().returns(createdByUser);

        const result = rowToInvite(unclaimedInviteRow, createdByRow, undefined);

        t.same(
          omit(result, "createdBy", "claimed", "claimedBy"),
          omit(unclaimedInvite, "createdBy", "claimed", "claimedBy"),
        );
        t.equal(result.createdBy, unclaimedInvite.createdBy);
        t.equal(result.claimed, undefined);
        t.equal(result.claimedBy, undefined);
      });
    });

    t.test("when claimed", async (t) => {
      const createdByRow = {};
      const claimedByRow = {};

      t.test(
        "converts created by and claimed by user rows to user objects",
        async (t) => {
          try {
            rowToInvite(claimedInviteRow, createdByRow, claimedByRow);
          } catch {}

          t.ok(rowToUserStub.called);
          const calls = rowToUserStub.getCalls();
          t.equal(calls.length, 2);
          t.equal(calls[0].firstArg, createdByRow);
          t.equal(calls[1].firstArg, claimedByRow);
        },
      );

      t.test("returns expected invite", async (t) => {
        rowToUserStub.onFirstCall().returns(createdByUser);
        rowToUserStub.onSecondCall().returns(claimedByUser);

        const result = rowToInvite(
          claimedInviteRow,
          createdByRow,
          claimedByRow,
        );

        t.same(
          omit(result, "createdBy", "claimedBy"),
          omit(claimedInvite, "createdBy", "claimedBy"),
        );
        t.equal(result.createdBy, claimedInvite.createdBy);
        t.equal(result.claimedBy, claimedInvite.claimedBy);
      });
    });
  });

  t.test("inviteToRow", async (t) => {
    const { inviteToRow } = importModule(t);
    const createdByRow = {};
    const claimedByRow = {};

    t.test("when unclaimed", async (t) => {
      t.test("converts created by user objects to row", async (t) => {
        try {
          inviteToRow(unclaimedInvite);
        } catch {}

        t.ok(userToRowStub.called);
        const calls = userToRowStub.getCalls();
        t.equal(calls.length, 1);
        t.equal(calls[0].firstArg, createdByUser);
      });

      t.test("returns expected rows", async (t) => {
        userToRowStub.onFirstCall().returns(createdByRow);

        const result = inviteToRow(unclaimedInvite);

        t.same(
          omit(result.inviteRow, "claimed", "claimed_by"),
          unclaimedInviteRow,
        );
        t.same(result.createdByRow, createdByRow);
        t.same(result.claimedByRow, undefined);
      });
    });

    t.test("when claimed", async (t) => {
      t.test(
        "converts created by and claimed by user objects to rows",
        async (t) => {
          try {
            inviteToRow(claimedInvite);
          } catch {}

          t.ok(userToRowStub.called);
          const calls = userToRowStub.getCalls();
          t.equal(calls.length, 2);
          t.equal(calls[0].firstArg, createdByUser);
          t.equal(calls[1].firstArg, claimedByUser);
        },
      );

      t.test("returns expected rows", async (t) => {
        userToRowStub.onFirstCall().returns(createdByRow);
        userToRowStub.onSecondCall().returns(claimedByRow);

        const result = inviteToRow(claimedInvite);

        t.same(result.inviteRow, claimedInviteRow);
        t.same(result.createdByRow, createdByRow);
        t.same(result.claimedByRow, claimedByRow);
      });
    });
  });
});
