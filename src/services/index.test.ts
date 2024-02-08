import sinon from "sinon";
import { test } from "tap";
import { testNowDate } from "../utils/testing/data";

// test objects
const dataProvider = {
  getUserCount: sinon.stub(),
  insertUser: sinon.stub(),
  insertInvite: sinon.stub(),
};

const uniqueStub = sinon.stub();
const nowFake = sinon.fake.returns(testNowDate);
const newInviteStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  const dependencies: any = {
    "../data": { getDataProvider: () => dataProvider },
    "../utils/time": { now: nowFake },
    "../utils/identifier": { unique: uniqueStub },
    "./invite": { newInvite: newInviteStub },
  };

  return test.mock("./index", dependencies);
}

// tests

test("services/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("initializeServices", async (t) => {
    let initializeServices: any;

    t.beforeEach(async () => {
      initializeServices = importModule(t).initializeServices;
    });

    t.test("gets the user count", async (t) => {
      try {
        await initializeServices();
      } catch {}

      t.ok(dataProvider.getUserCount.called);
      t.equal(dataProvider.getUserCount.firstCall.args.length, 0);
    });

    t.test("when no users", async (t) => {
      t.beforeEach(() => {
        dataProvider.getUserCount.resolves(0);
        uniqueStub.returns("user-id");
      });

      t.test("creates root admin user", async (t) => {
        try {
          await initializeServices();
        } catch {}

        t.ok(dataProvider.insertUser.called);
        t.same(dataProvider.insertUser.firstCall.firstArg, {
          id: "user-id",
          created: testNowDate,
          username: "root",
          displayName: "Root Admin",
          isAdmin: true,
        });
      });

      t.test("creates first admin invite", async (t) => {
        const rootAdmin = {};
        dataProvider.insertUser.resolves(rootAdmin);

        try {
          await initializeServices();
        } catch {}

        t.ok(newInviteStub.called);
        t.equal(newInviteStub.firstCall.args[0], rootAdmin);
        t.equal(newInviteStub.firstCall.args[1], true);
      });

      t.test("inserts admin invite", async (t) => {
        const firstInvite = {};
        newInviteStub.resolves(firstInvite);

        try {
          await initializeServices();
        } catch {}

        t.ok(dataProvider.insertInvite.called);
        t.equal(dataProvider.insertInvite.firstCall.firstArg, firstInvite);
      });

      t.test("returns new inserted admin invite", async (t) => {
        const insertedInvite = {};
        dataProvider.insertInvite.resolves(insertedInvite);

        const result = await initializeServices();

        t.ok(result);
        t.equal(result, insertedInvite);
      });
    });

    t.test("if some users, does nothing", async (t) => {
      dataProvider.getUserCount.resolves(1);

      await initializeServices();

      t.notOk(dataProvider.insertUser.called);
      t.notOk(uniqueStub.called);
      t.notOk(nowFake.called);
      t.notOk(dataProvider.insertInvite.called);
    });
  });
});
