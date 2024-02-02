import { omit } from "lodash";
import sinon from "sinon";
import { test } from "tap";

import { RowData } from "google-sheets-table";
import { Duration } from "luxon";
import { FileInfo } from "../../../types/entity";
import { testShare1, testUser1, testUser2 } from "../../../utils/testing/data";

// test objects

const createdByUser = testUser2();
const claimedByUser = testUser1();
const file: FileInfo = {
  id: "doc_1",
  type: "document",
  title: "Example Test Doc",
  availableMediaTypes: [
    {
      name: "application/msword",
      description: "Microsoft Word",
      extension: "doc",
    },
    {
      name: "application/pdf",
      description: "Adobe Portable Document Format",
      extension: "pdf",
    },
  ],
};
const unclaimedShare = testShare1(createdByUser, { file });
const claimedShare = testShare1(createdByUser, {
  file,
  claimedBy: claimedByUser,
});
claimedShare.toUsername = "mike";
claimedShare.expireDuration = Duration.fromObject({ days: 3 });

const unclaimedShareRow: RowData = {
  id: "SHARE_1",
  is_admin: false,
  created: "2023-01-01T00:00:00.000Z",
  created_by: createdByUser.id,
  backing_url: `https://example.com/${file.id}`,
  file_title: file.title,
  file_type: file.type,
  available_media_types: file.availableMediaTypes.map((t) => t.name).join(","),
};
const claimedShareRow: RowData = {
  ...unclaimedShareRow,
  to_username: "mike",
  expire_duration: "P3D",
  claimed: "2023-01-02T00:00:00.000Z",
  claimed_by: claimedByUser.id,
};

const rowToUserStub = sinon.stub();
const userToRowStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./share", {
    "./user": {
      rowToUser: rowToUserStub,
      userToRow: userToRowStub,
    },
  });
}

test("data/data-providers/google-sheets/share", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("rowToShare", async (t) => {
    const { rowToShare } = importModule(t);

    t.test("when unclaimed", async (t) => {
      const createdByRow = {};

      t.test("converts created by user row to user object", async (t) => {
        try {
          rowToShare(unclaimedShareRow, createdByRow, undefined);
        } catch {}

        t.ok(rowToUserStub.called);
        const calls = rowToUserStub.getCalls();
        t.equal(calls.length, 1);
        t.equal(calls[0].firstArg, createdByRow);
      });

      t.test("returns expected invite", async (t) => {
        rowToUserStub.onFirstCall().returns(createdByUser);

        const result = rowToShare(unclaimedShareRow, createdByRow, undefined);

        t.same(
          omit(
            result,
            "createdBy",
            "claimed",
            "claimedBy",
            "toUsername",
            "expireDuration"
          ),
          omit(unclaimedShare, "createdBy", "claimed", "claimedBy")
        );
        t.equal(result.createdBy, unclaimedShare.createdBy);
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
            rowToShare(claimedShareRow, createdByRow, claimedByRow);
          } catch {}

          t.ok(rowToUserStub.called);
          const calls = rowToUserStub.getCalls();
          t.equal(calls.length, 2);
          t.equal(calls[0].firstArg, createdByRow);
          t.equal(calls[1].firstArg, claimedByRow);
        }
      );

      t.test("returns expected invite", async (t) => {
        rowToUserStub.onFirstCall().returns(createdByUser);
        rowToUserStub.onSecondCall().returns(claimedByUser);

        const result = rowToShare(claimedShareRow, createdByRow, claimedByRow);

        t.same(
          omit(result, "createdBy", "claimedBy"),
          omit(claimedShare, "createdBy", "claimedBy")
        );
        t.equal(result.createdBy, claimedShare.createdBy);
        t.equal(result.claimedBy, claimedShare.claimedBy);
      });
    });
  });

  t.test("shareToRow", async (t) => {
    const { shareToRow } = importModule(t);
    const createdByRow = {};
    const claimedByRow = {};

    t.test("when unclaimed", async (t) => {
      t.test("converts created by user objects to row", async (t) => {
        try {
          shareToRow(unclaimedShare);
        } catch {}

        t.ok(userToRowStub.called);
        const calls = userToRowStub.getCalls();
        t.equal(calls.length, 1);
        t.equal(calls[0].firstArg, createdByUser);
      });

      t.test("returns expected rows", async (t) => {
        userToRowStub.onFirstCall().returns(createdByRow);

        const result = shareToRow(unclaimedShare);

        t.same(
          omit(
            result.shareRow,
            "claimed",
            "claimed_by",
            "to_username",
            "expire_duration"
          ),
          unclaimedShareRow
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
            shareToRow(claimedShare);
          } catch {}

          t.ok(userToRowStub.called);
          const calls = userToRowStub.getCalls();
          t.equal(calls.length, 2);
          t.equal(calls[0].firstArg, createdByUser);
          t.equal(calls[1].firstArg, claimedByUser);
        }
      );

      t.test("returns expected rows", async (t) => {
        userToRowStub.onFirstCall().returns(createdByRow);
        userToRowStub.onSecondCall().returns(claimedByRow);

        const result = shareToRow(claimedShare);

        t.same(result.shareRow, claimedShareRow);
        t.same(result.createdByRow, createdByRow);
        t.same(result.claimedByRow, claimedByRow);
      });
    });
  });
});
