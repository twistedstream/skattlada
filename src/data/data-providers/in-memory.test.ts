import { cloneDeep } from "lodash";
import { DateTime } from "luxon";
import sinon from "sinon";
import { t, Test } from "tap";

import {
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "../../types/entity";
import { InMemoryDataProviderOptions } from "../../types/test";
import {
  testCredential1,
  testCredential2,
  testInvite1,
  testShare1,
  testShare2,
  testShare3,
  testUser1,
  testUser2,
} from "../../utils/testing/data";
import { InMemoryDataProvider } from "./in-memory";

// test objects

const logger = {
  info: sinon.fake(),
  debug: sinon.fake(),
};

// helpers

function importModule(t: Test) {
  return t.mockRequire("./in-memory", {
    "../../utils/logger": { logger },
  });
}

// tests

t.test("data/data-providers/in-memory", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("InMemoryDataProvider", async (t) => {
    t.test("constructor", async (t) => {
      t.test("sets up initial state", async (t) => {
        const users: any[] = [];
        const credentials: any[] = [];
        const invites: any[] = [];
        const shares: any[] = [];

        const { InMemoryDataProvider } = importModule(t);

        const result = new InMemoryDataProvider({
          users,
          credentials,
          invites,
          shares,
        });

        t.equal(result._initialized, false);
        t.equal(result._users, users);
        t.equal(result._credentials, credentials);
        t.equal(result._invites, invites);
        t.equal(result._shares, shares);
      });
    });

    t.test("instance methods", async (t) => {
      function createInstance(
        options: InMemoryDataProviderOptions = {},
      ): InMemoryDataProvider {
        const { InMemoryDataProvider } = importModule(t);

        return new InMemoryDataProvider(options);
      }

      t.test("initialize", async (t) => {
        t.test("logs that initialization was done", async (t) => {
          const provider = createInstance();

          await provider.initialize();

          t.ok(logger.info.called);
        });

        t.test("ensures that initialization only happens once", async (t) => {
          const provider = createInstance();

          await provider.initialize();
          sinon.resetHistory();

          await provider.initialize();

          t.notOk(logger.info.called);
        });
      });

      t.test("getUserCount", async (t) => {
        t.test("returns expected count", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const provider = createInstance({ users });

          const result = await provider.getUserCount();

          t.equal(result, 1);
        });
      });

      t.test("findUserById", async (t) => {
        t.test("if user exists, returns a copy", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const provider = createInstance({ users });

          const result = await provider.findUserById(user1.id);

          t.not(result, user1);
          t.same(result, user1);
        });

        t.test("if user doesn't exist, returns nothing", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const provider = createInstance({ users });

          const result = await provider.findUserById("unknown-id");

          t.equal(result, undefined);
        });
      });

      t.test("findUserByName", async (t) => {
        t.test("if user exists, returns a copy", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const provider = createInstance({ users });

          const result = await provider.findUserByName(user1.username);

          t.not(result, user1);
          t.same(result, user1);
        });

        t.test("if user doesn't exist, returns nothing", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const provider = createInstance({ users });

          const result = await provider.findUserByName("unknown-name");

          t.equal(result, undefined);
        });
      });

      t.test("insertUser", async (t) => {
        t.test("inserts a copy of the user", async (t) => {
          const user1 = testUser1();
          const users: User[] = [];
          const provider = createInstance({ users });

          await provider.insertUser(user1);

          t.equal(users.length, 1);
          t.not(users[0], user1);
          t.same(users[0], user1);
        });

        t.test("returns a copy of the inserted user", async (t) => {
          const user1 = testUser1();
          const users: User[] = [];
          const provider = createInstance({ users: users });

          const result = await provider.insertUser(user1);

          t.not(result, user1);
          t.same(result, user1);
        });
      });

      t.test("updateUser", async (t) => {
        t.test("if user exists, performs expected updates on it", async (t) => {
          const user1 = testUser1();
          const before = cloneDeep(user1);
          const users = [user1];
          const provider = createInstance({ users });

          await provider.updateUser({
            ...user1,
            created: DateTime.now(),
            username: "bob2",
            displayName: "Bob User 2",
            isAdmin: true,
          });

          // only the specific fields were altered
          t.same(user1, { ...before, displayName: "Bob User 2" });
        });

        t.test("if user doesn't exist, does nothing", async (t) => {
          const user1 = testUser1();
          const before = cloneDeep(user1);
          const users = [user1];
          const provider = createInstance({ users });

          await provider.updateUser({
            id: "no-exist",
            created: DateTime.now(),
            username: "bob2",
            displayName: "Bob User 2",
            isAdmin: true,
          });

          t.same(user1, before);
        });
      });

      t.test("findCredentialById", async (t) => {
        t.test("if credential exists, returns a copy", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const credentials = [cred1];
          const provider = createInstance({ credentials });

          const result = await provider.findCredentialById(cred1.credentialID);

          t.not(result, cred1);
          t.same(result, cred1);
        });

        t.test("if credential doesn't exist, returns nothing", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const credentials = [cred1];
          const provider = createInstance({ credentials });

          const result = await provider.findCredentialById("unknown-id");

          t.equal(result, undefined);
        });
      });

      t.test("findUserCredential", async (t) => {
        t.test("if credential exists, returns a copy", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const credentials = [cred1];
          const provider = createInstance({ credentials });

          const result = await provider.findUserCredential(
            cred1.user.id,
            cred1.credentialID,
          );

          t.not(result, cred1);
          t.same(result, cred1);
        });

        t.test(
          "if user doesn't exists but credential does, returns nothing",
          async (t) => {
            const cred1 = { ...testCredential1(), user: testUser1() };
            const credentials = [cred1];
            const provider = createInstance({ credentials });

            const result = await provider.findUserCredential(
              "unknown-id",
              cred1.credentialID,
            );

            t.equal(result, undefined);
          },
        );

        t.test(
          "if user exists but credential doesn't, returns nothing",
          async (t) => {
            const cred1 = { ...testCredential1(), user: testUser1() };
            const credentials = [cred1];
            const provider = createInstance({ credentials });

            const result = await provider.findUserCredential(
              cred1.user.id,
              "unknown-id",
            );

            t.equal(result, undefined);
          },
        );

        t.test(
          "if neither user or credential exist, returns nothing",
          async (t) => {
            const cred1 = { ...testCredential1(), user: testUser1() };
            const credentials = [cred1];
            const provider = createInstance({ credentials });

            const result = await provider.findUserCredential(
              "unknown-id",
              "unknown-id",
            );

            t.equal(result, undefined);
          },
        );
      });

      t.test("findCredentialsByUser", async (t) => {
        t.test(
          "if user exists, returns a copy of the associated credentials",
          async (t) => {
            const cred1 = { ...testCredential1(), user: testUser1() };
            const cred2 = { ...testCredential2(), user: testUser2() };
            const credentials = [cred1, cred2];
            const provider = createInstance({ credentials });

            const result = await provider.findCredentialsByUser(cred1.user.id);

            t.equal(result.length, 1);
            t.not(result[0], cred1);
            t.same(result[0], cred1);
          },
        );

        t.test("if user doesn't exist, returns an empty array", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const cred2 = { ...testCredential2(), user: testUser2() };
          const credentials = [cred1, cred2];
          const provider = createInstance({ credentials });

          const result = await provider.findCredentialsByUser("no-exist");

          t.equal(result.length, 0);
        });
      });

      t.test("insertCredential", async (t) => {
        t.test(
          "if user exists, inserts a copy of the credential, associating it with the specified user",
          async (t) => {
            const user1 = testUser1();
            const users = [user1];
            const cred1 = testCredential1();
            const credentials: RegisteredAuthenticator[] = [];
            const provider = createInstance({ users, credentials });

            await provider.insertCredential(user1.id, cred1);

            t.equal(credentials.length, 1);
            t.not(credentials[0], cred1);
            t.same(credentials[0], { ...cred1, user: testUser1() });
          },
        );

        t.test(
          "if user doesn't exist, throws expected exception",
          async (t) => {
            const user1 = testUser1();
            const user2 = testUser2();
            const users = [user1];

            const provider = createInstance({ users });

            const cred1 = testCredential1();
            t.rejects(() => provider.insertCredential(user2.id, cred1), {
              message: "User does not exist",
            });
          },
        );
      });

      t.test("deleteCredential", async (t) => {
        t.test("if credential exists, removed it", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const cred2 = { ...testCredential2(), user: testUser2() };
          const credentials = [cred1, cred2];
          const provider = createInstance({ credentials });

          await provider.deleteCredential(cred2.credentialID);

          t.equal(credentials.length, 1);
          t.equal(credentials[0], cred1);
        });

        t.test("if credential doesn't exist, do nothing", async (t) => {
          const cred1 = { ...testCredential1(), user: testUser1() };
          const cred2 = { ...testCredential2(), user: testUser2() };
          const credentials = [cred1, cred2];
          const provider = createInstance({ credentials });

          await provider.deleteCredential("no-exist");

          t.equal(credentials.length, 2);
          t.equal(credentials[0], cred1);
          t.equal(credentials[1], cred2);
        });
      });

      t.test("findInviteById", async (t) => {
        t.test("if invite exists, returns a copy", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const invite1 = testInvite1(user2);
          const invites = [invite1];
          const provider = createInstance({ users, invites });

          const result = await provider.findInviteById(invite1.id);

          t.not(result, invite1);
          t.same(result, invite1);
        });

        t.test("if invite doesn't exist, returns nothing", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const invite1 = testInvite1(user2);
          const invites = [invite1];
          const provider = createInstance({ users, invites });

          const result = await provider.findInviteById("unknown-id");

          t.equal(result, undefined);
        });
      });

      t.test("insertInvite", async (t) => {
        t.test("inserts a copy of the invite", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const invite1 = testInvite1(user2);
          const invites: Invite[] = [];
          const provider = createInstance({ users, invites });

          await provider.insertInvite(invite1);

          t.equal(invites.length, 1);
          t.not(invites[0], invite1);
          t.same(invites[0], invite1);
        });

        t.test("returns a copy of the invite", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const invite1 = testInvite1(user2);
          const invites: Invite[] = [];
          const provider = createInstance({ users, invites });

          const result = await provider.insertInvite(invite1);

          t.not(result, invite1);
          t.same(result, invite1);
        });
      });

      t.test("updateInvite", async (t) => {
        t.test(
          "if invite exists, performs expected updates on it",
          async (t) => {
            const user2 = testUser2();
            const users = [user2];
            const invite1 = testInvite1(user2);
            const before = cloneDeep(invite1);
            const invites = [invite1];
            const user1 = testUser1();
            const provider = createInstance({ users, invites });

            const now = DateTime.now();

            await provider.updateInvite({
              ...invite1,
              claimed: now,
              claimedBy: user1,
              sourceType: "share",
              created: now,
              isAdmin: false,
              createdBy: user1,
            });

            // only the specific fields were altered
            t.same(invite1, { ...before, claimed: now, claimedBy: user1 });
          },
        );

        t.test("if invite doesn't exist, does nothing", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const invite1 = testInvite1(user2);
          const before = cloneDeep(invite1);
          const invites = [invite1];
          const user1 = testUser1();
          const provider = createInstance({ users, invites });

          const now = DateTime.now();

          await provider.updateInvite({
            id: "no-exist",
            claimed: now,
            claimedBy: user1,
            sourceType: "share",
            created: now,
            isAdmin: false,
            createdBy: user1,
          });

          t.same(invite1, before);
        });
      });

      t.test("findShareById", async (t) => {
        t.test("if share exists, returns a copy", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const share1 = testShare1(user1);
          const shares = [share1];
          const provider = createInstance({ users, shares });

          const result = await provider.findShareById(share1.id);

          t.not(result, share1);
          t.same(result, share1);
        });

        t.test("if share doesn't exist, returns nothing", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const share1 = testShare1(user1);
          const shares = [share1];
          const provider = createInstance({ users, shares });

          const result = await provider.findShareById("unknown-id");

          t.equal(result, undefined);
        });
      });

      t.test("findSharesByClaimedUserId", async (t) => {
        t.test("if relevant shares exit, returns a copy of them", async (t) => {
          const user1 = testUser1();
          const user2 = testUser2();
          const users = [user1, user2];
          const share1 = testShare1(user1);
          const share2 = testShare2(user1);
          const share3 = testShare3(user1);
          share1.claimed = DateTime.now();
          share1.claimedBy = user2;
          share3.claimed = DateTime.now();
          share3.claimedBy = user2;
          const shares = [share1, share2, share3];
          const provider = createInstance({ users, shares });

          const result = await provider.findSharesByClaimedUserId(user2.id);

          t.equal(result.length, 2);
          t.not(result[0], share1);
          t.same(result[0], share1);
          t.not(result[1], share3);
          t.same(result[1], share3);
        });
      });

      t.test("findSharesByCreatedUserId", async (t) => {
        t.test("if relevant shares exit, returns a copy of them", async (t) => {
          const user1 = testUser1();
          const user2 = testUser2();
          const users = [user1, user2];
          const share1 = testShare1(user1);
          const share2 = testShare2(user1);
          const share3 = testShare3(user1);
          share1.claimed = DateTime.now();
          share1.claimedBy = user2;
          share3.claimed = DateTime.now();
          share3.claimedBy = user2;
          const shares = [share1, share2, share3];
          const provider = createInstance({ users, shares });

          const result = await provider.findSharesByCreatedUserId(user1.id);

          t.equal(result.length, 3);
          t.not(result[0], share1);
          t.same(result[0], share1);
          t.not(result[1], share2);
          t.same(result[1], share2);
          t.not(result[2], share3);
          t.same(result[2], share3);
        });
      });

      t.test("insertShare", async (t) => {
        t.test("inserts a copy of the share", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const share1 = testShare1(user1);
          const shares: Share[] = [];
          const provider = createInstance({ users, shares });

          await provider.insertShare(share1);

          t.equal(shares.length, 1);
          t.not(shares[0], share1);
          t.same(shares[0], share1);
        });

        t.test("returns a copy of the share", async (t) => {
          const user1 = testUser1();
          const users = [user1];
          const share1 = testShare1(user1);
          const shares: Share[] = [];
          const provider = createInstance({ users, shares });

          const result = await provider.insertShare(share1);

          t.not(result, share1);
          t.same(result, share1);
        });
      });

      t.test("updateShare", async (t) => {
        t.test(
          "if share exists, performs expected updates on it",
          async (t) => {
            const user2 = testUser2();
            const users = [user2];
            const share1 = testShare1(user2);
            const before = cloneDeep(share1);
            const shares = [share1];
            const user1 = testUser1();
            const provider = createInstance({ users, shares });

            const now = DateTime.now();

            await provider.updateShare({
              ...share1,
              backingUrl: "https://foo.com",
              fileTitle: "Changed Title",
              fileType: "pdf",
              claimed: now,
              claimedBy: user1,
              sourceType: "invite",
              created: now,
              isAdmin: false,
              createdBy: user1,
            });

            // only the specific fields were altered
            t.same(share1, { ...before, claimed: now, claimedBy: user1 });
          },
        );

        t.test("if share doesn't exist, does nothing", async (t) => {
          const user2 = testUser2();
          const users = [user2];
          const share1 = testShare1(user2);
          const before = cloneDeep(share1);
          const shares = [share1];
          const user1 = testUser1();
          const provider = createInstance({ users, shares });

          const now = DateTime.now();

          await provider.updateShare({
            id: "no-exist",
            backingUrl: "https://foo.com",
            fileTitle: "Changed Title",
            fileType: "pdf",
            availableMediaTypes: [
              { name: "application/pdf", description: "PDF", extension: "pdf" },
            ],
            claimed: now,
            claimedBy: user1,
            sourceType: "invite",
            created: now,
            isAdmin: false,
            createdBy: user1,
          });

          t.same(share1, before);
        });
      });
    });
  });
});
