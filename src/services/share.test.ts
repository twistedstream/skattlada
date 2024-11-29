import { DateTime, Duration } from "luxon";
import sinon from "sinon";
import { test } from "tap";
import { testNowDate } from "../utils/testing/data";

// test objects
const dataProvider = {
  findFileInfo: sinon.stub(),
  findSharesByClaimedUserId: sinon.stub(),
  findSharesByCreatedUserId: sinon.stub(),
  findShareById: sinon.stub(),
  findUserByName: sinon.stub(),
  insertShare: sinon.stub(),
  updateShare: sinon.stub(),
};

const fileProvider = {
  getFileInfo: sinon.stub(),
};

const uniqueStub = sinon.stub();
const nowFake = sinon.fake.returns(testNowDate);

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./share", {
    "../data": {
      getDataProvider: () => dataProvider,
      getFileProvider: () => fileProvider,
    },
    "../utils/time": { now: nowFake },
    "../utils/identifier": { unique: uniqueStub },
  });
}

// tests

test("services/share", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fetchSharesByClaimedUserId", async (t) => {
    let fetchSharesByClaimedUserId: any;

    t.beforeEach(async () => {
      fetchSharesByClaimedUserId = importModule(t).fetchSharesByClaimedUserId;
    });

    t.test("finds shares by claimed user ID", async (t) => {
      try {
        await fetchSharesByClaimedUserId("user-id");
      } catch {}

      t.ok(dataProvider.findSharesByClaimedUserId.called);
      t.equal(
        dataProvider.findSharesByClaimedUserId.firstCall.firstArg,
        "user-id",
      );
    });

    t.test("returns found shares", async (t) => {
      const shares = [{}, {}];
      dataProvider.findSharesByClaimedUserId.resolves(shares);

      const result = await fetchSharesByClaimedUserId("user-id");

      t.ok(result);
      t.equal(result, shares);
    });
  });

  t.test("fetchSharesByCreatedUserId", async (t) => {
    let fetchSharesByCreatedUserId: any;

    t.beforeEach(async () => {
      fetchSharesByCreatedUserId = importModule(t).fetchSharesByCreatedUserId;
    });

    t.test("finds shares by created user ID", async (t) => {
      try {
        await fetchSharesByCreatedUserId("user-id");
      } catch {}

      t.ok(dataProvider.findSharesByCreatedUserId.called);
      t.equal(
        dataProvider.findSharesByCreatedUserId.firstCall.firstArg,
        "user-id",
      );
    });

    t.test("returns found shares", async (t) => {
      const shares = [{}, {}];
      dataProvider.findSharesByCreatedUserId.resolves(shares);

      const result = await fetchSharesByCreatedUserId("user-id");

      t.ok(result);
      t.equal(result, shares);
    });
  });

  t.test("fetchShareById", async (t) => {
    let fetchShareById: any;

    t.beforeEach(async () => {
      fetchShareById = importModule(t).fetchShareById;
    });

    t.test("finds share by ID", async (t) => {
      try {
        await fetchShareById("share-id");
      } catch {}

      t.ok(dataProvider.findShareById.called);
      t.equal(dataProvider.findShareById.firstCall.firstArg, "share-id");
    });

    t.test("returns found shares", async (t) => {
      const share = {};
      dataProvider.findShareById.resolves(share);

      const result = await fetchShareById("share-id");

      t.ok(result);
      t.equal(result, share);
    });
  });

  t.test("newShare", async (t) => {
    let newShare: any;

    t.beforeEach(async () => {
      newShare = importModule(t).newShare;
    });

    t.test("Get file info from backing URL", async (t) => {
      try {
        await newShare({}, "https://example.com/doc1");
      } catch {}

      t.ok(fileProvider.getFileInfo.called);
      t.equal(
        fileProvider.getFileInfo.firstCall.firstArg,
        "https://example.com/doc1",
      );
    });

    t.test("If file info does't exist, throws expected error", async (t) => {
      fileProvider.getFileInfo.resolves(undefined);

      t.rejects(() => newShare({}, "https://example.com/doc1"), {
        message: "File not found or invalid URL",
        type: "validation",
        entity: "Share",
        field: "backingUrl",
      });
    });

    t.test("when file exists", async (t) => {
      t.beforeEach(async () => {
        fileProvider.getFileInfo.resolves({
          title: "Test Document",
          type: "document",
          availableMediaTypes: [
            {
              name: "simple/doc",
              description: "Simple Doc",
              fileExtension: "d",
            },
          ],
        });
      });

      t.test("when 'to' username is specified", async (t) => {
        t.test("Finds user by name", async (t) => {
          try {
            await newShare({}, "https://example.com/doc1", "user-name");
          } catch {}

          t.ok(dataProvider.findUserByName.called);
          t.equal(dataProvider.findUserByName.firstCall.firstArg, "user-name");
        });

        t.test("If user doesn't exist, throws expected error", async (t) => {
          dataProvider.findUserByName.resolves(undefined);

          t.rejects(
            () => newShare({}, "https://example.com/doc1", "user-name"),
            {
              message: "User does not exist",
              type: "validation",
              entity: "Share",
              field: "toUsername",
            },
          );
        });

        t.test("if user does exist, returns expected share", async (t) => {
          dataProvider.findUserByName.resolves({});
          uniqueStub.returns("share-id");
          const by = {};
          const expireDuration = Duration.fromObject({ days: 2 });

          const result = await newShare(
            by,
            "https://example.com/doc1",
            "user-name",
            expireDuration,
          );

          t.ok(result);
          t.same(result, {
            id: "share-id",
            isAdmin: false,
            created: testNowDate,
            createdBy: by,
            sourceType: "share",
            backingUrl: "https://example.com/doc1",
            toUsername: "user-name",
            expireDuration,
            fileTitle: "Test Document",
            fileType: "document",
            availableMediaTypes: [
              {
                name: "simple/doc",
                description: "Simple Doc",
                fileExtension: "d",
              },
            ],
          });
        });
      });

      t.test("when 'to' username is not specified", async (t) => {
        t.test("returns expected share", async (t) => {
          dataProvider.findUserByName.resolves({});
          uniqueStub.returns("share-id");
          const by = {};

          const result = await newShare(by, "https://example.com/doc1");

          t.ok(result);
          t.same(result, {
            id: "share-id",
            isAdmin: false,
            created: testNowDate,
            createdBy: by,
            sourceType: "share",
            backingUrl: "https://example.com/doc1",
            toUsername: undefined,
            expireDuration: undefined,
            fileTitle: "Test Document",
            fileType: "document",
            availableMediaTypes: [
              {
                name: "simple/doc",
                description: "Simple Doc",
                fileExtension: "d",
              },
            ],
          });
        });
      });
    });
  });

  t.test("createShare", async (t) => {
    let createShare: any;

    t.beforeEach(async () => {
      createShare = importModule(t).createShare;
    });

    t.test("inserts share", async (t) => {
      const share = {};

      try {
        await createShare(share);
      } catch {}

      t.ok(dataProvider.insertShare.called);
      t.equal(dataProvider.insertShare.firstCall.firstArg, share);
    });

    t.test("returns inserted share", async (t) => {
      const insertedShare = {};
      dataProvider.insertShare.resolves(insertedShare);

      const result = await createShare({});

      t.ok(result);
      t.equal(result, insertedShare);
    });
  });

  t.test("claimShare", async (t) => {
    let claimShare: any;

    t.beforeEach(async () => {
      claimShare = importModule(t).claimShare;
    });

    t.test("finds share by ID", async (t) => {
      try {
        await claimShare("share-id", {});
      } catch {}

      t.ok(dataProvider.findShareById.called);
      t.equal(dataProvider.findShareById.firstCall.firstArg, "share-id");
    });

    t.test("if share doesn't exist, throws expected error", async (t) => {
      dataProvider.findShareById.resolves(undefined);

      t.rejects(() => claimShare("share-id", {}), {
        message: "Share with ID 'share-id' does not exist",
      });
    });

    t.test("if share is already claimed, throws expected error", async (t) => {
      dataProvider.findShareById.resolves({
        claimed: DateTime.fromObject({ year: 2023, month: 1, day: 1 }),
      });

      t.rejects(() => claimShare("share-id", {}), {
        message: "Share with ID 'share-id' has already been claimed",
      });
    });

    t.test("when share exists and is not claimed", async (t) => {
      let existingShare: any;

      t.beforeEach(async () => {
        existingShare = {};
        dataProvider.findShareById.onFirstCall().resolves(existingShare);
      });

      t.test("updates the share with expected claimed values", async (t) => {
        const by = {};

        try {
          await claimShare("share-id", by);
        } catch {}

        t.ok(dataProvider.updateShare.called);
        t.equal(dataProvider.updateShare.firstCall.firstArg, existingShare);
        t.equal(existingShare.claimed, testNowDate);
        t.equal(existingShare.claimedBy, by);
      });

      t.test("re-fetches the updated share", async (t) => {
        existingShare.id = "share-id";

        try {
          await claimShare("share-id", {});
        } catch {}

        t.ok(dataProvider.findShareById.calledTwice);
        t.equal(dataProvider.findShareById.secondCall.firstArg, "share-id");
      });

      t.test("returns the updated share", async (t) => {
        const updatedShare = {};
        dataProvider.findShareById.onSecondCall().resolves(updatedShare);

        const result = await claimShare("share-id", {});

        t.ok(result);
        t.equal(result, updatedShare);
      });
    });
  });
});
