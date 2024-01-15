import { DateTime } from "luxon";
import sinon from "sinon";
import { test } from "tap";
import { testNowDate } from "../utils/testing/data";

// test objects
const dataProvider = {
  insertUser: sinon.stub(),
  insertInvite: sinon.stub(),
  findInviteById: sinon.stub(),
  updateInvite: sinon.stub(),
};

const uniqueStub = sinon.stub();
const nowFake = sinon.fake.returns(testNowDate);

// helpers

function importModule(test: Tap.Test) {
  const dependencies: any = {
    "../data": { getDataProvider: () => dataProvider },
    "../utils/time": { now: nowFake },
    "../utils/identifier": { unique: uniqueStub },
  };

  return test.mock("./invite", dependencies);
}

// tests

test("services/invite", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("newInvite", async (t) => {
    let newInvite: any;

    t.beforeEach(async () => {
      newInvite = importModule(t).newInvite;
    });

    t.test("creates an invite with expected core data", async (t) => {
      const by = {};
      uniqueStub.returns("invite-id");

      const result = await newInvite(by, false);

      t.ok(result);
      t.equal(result.id, "invite-id");
      t.equal(result.sourceType, "invite");
      t.equal(result.created, testNowDate);
      t.equal(result.createdBy, by);
    });

    t.test(
      "if admin specified, creates an expected admin invite",
      async (t) => {
        const by = {};

        const result = await newInvite(by, true);

        t.ok(result.isAdmin);
      }
    );

    t.test(
      "if no admin specified, creates an expected non-admin invite",
      async (t) => {
        const by = {};

        const result = await newInvite(by, false);

        t.notOk(result.isAdmin);
      }
    );
  });

  t.test("fetchInviteById", async (t) => {
    let fetchInviteById: any;

    t.beforeEach(async () => {
      fetchInviteById = importModule(t).fetchInviteById;
    });

    t.test("finds the invite by ID", async (t) => {
      try {
        await fetchInviteById("invite-id");
      } catch {}

      t.ok(dataProvider.findInviteById.called);
      t.equal(dataProvider.findInviteById.firstCall.firstArg, "invite-id");
    });

    t.test("returns the found invite", async (t) => {
      const invite = {};
      dataProvider.findInviteById.resolves(invite);

      const result = await fetchInviteById("invite-id");

      t.ok(result);
      t.equal(result, invite);
    });
  });

  t.test("claimInvite", async (t) => {
    let claimInvite: any;

    t.beforeEach(async () => {
      claimInvite = importModule(t).claimInvite;
    });

    t.test("finds existing invite", async (t) => {
      try {
        await claimInvite("invite-id", {});
      } catch {}

      t.ok(dataProvider.findInviteById.called);
      t.equal(dataProvider.findInviteById.firstCall.firstArg, "invite-id");
    });

    t.test("if invite doesn't exist, throws expected error", async (t) => {
      dataProvider.findInviteById.resolves(undefined);

      t.rejects(async () => await claimInvite("invite-id", {}), {
        message: "Invite with ID 'invite-id' does not exist",
      });
    });

    t.test(
      "if invite has already been claimed, throws expected error",
      async (t) => {
        const invite = {
          claimed: DateTime.fromObject({ year: 2023, month: 1, day: 1 }),
        };
        dataProvider.findInviteById.resolves(invite);

        t.rejects(async () => await claimInvite("invite-id", {}), {
          message: "Invite with ID 'invite-id' has already been claimed",
        });
      }
    );

    t.test("when unclaimed invite", async (t) => {
      let invite: any;

      t.beforeEach(async () => {
        invite = { id: "invite-id" };
        dataProvider.findInviteById.onFirstCall().resolves(invite);
      });

      t.test("claims invite and updates the database", async (t) => {
        const by = {};

        try {
          await claimInvite("invite-id", by);
        } catch {}

        t.equal(invite.claimed, testNowDate);
        t.equal(invite.claimedBy, by);
        t.ok(dataProvider.updateInvite.called);
        t.equal(dataProvider.updateInvite.firstCall.firstArg, invite);
      });

      t.test("re-fetches the updated invite", async (t) => {
        try {
          await claimInvite("invite-id", {});
        } catch {}

        t.ok(dataProvider.findInviteById.calledTwice);
        t.equal(dataProvider.findInviteById.secondCall.firstArg, "invite-id");
      });

      t.test("returns the updated invite", async (t) => {
        const updatedInvite = {};
        dataProvider.findInviteById.onSecondCall().resolves(updatedInvite);

        const result = await claimInvite("invite-id", {});

        t.ok(result);
        t.equal(result, updatedInvite);
      });
    });
  });
});
