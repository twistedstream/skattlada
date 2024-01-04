import sinon from "sinon";
import { test } from "tap";

import { RowData } from "../../../types/table";
import {
  testCredential1,
  testInvite1,
  testShare1,
  testUser1,
  testUser2,
} from "../../../utils/testing/data";
import { CREDENTIAL_CONSTRAINTS, CREDENTIAL_SHEET_NAME } from "./credential";
import { GoogleSheetsDataProvider } from "./index";
import { INVITE_CONSTRAINTS, INVITE_SHEET_NAME } from "./invite";
import { SHARE_CONSTRAINTS, SHARE_SHEET_NAME } from "./share";
import { USER_CONSTRAINTS, USER_SHEET_NAME } from "./user";

// test objects

const countRowsStub = sinon.stub();
const deleteRowStub = sinon.stub();
const findKeyRowsStub = sinon.stub();
const findRowStub = sinon.stub();
const findRowsStub = sinon.stub();
const insertRowStub = sinon.stub();
const updateRowStub = sinon.stub();

const credentialToRowStub = sinon.stub();
const rowToCredentialStub = sinon.stub();

const inviteToRowStub = sinon.stub();
const rowToInviteStub = sinon.stub();

const rowToShareStub = sinon.stub();
const shareToRowStub = sinon.stub();

const rowToUserStub = sinon.stub();
const userToRowStub = sinon.stub();

const logger = {
  info: sinon.fake(),
  debug: sinon.fake(),
};

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "../../../utils/google/sheets": {
      countRows: countRowsStub,
      deleteRow: deleteRowStub,
      findKeyRows: findKeyRowsStub,
      findRow: findRowStub,
      findRows: findRowsStub,
      insertRow: insertRowStub,
      updateRow: updateRowStub,
    },
    "./credential": {
      CREDENTIAL_CONSTRAINTS,
      CREDENTIAL_SHEET_NAME,
      credentialToRow: credentialToRowStub,
      rowToCredential: rowToCredentialStub,
    },
    "./invite": {
      INVITE_CONSTRAINTS,
      INVITE_SHEET_NAME,
      inviteToRow: inviteToRowStub,
      rowToInvite: rowToInviteStub,
    },
    "./share": {
      SHARE_CONSTRAINTS,
      SHARE_SHEET_NAME,
      rowToShare: rowToShareStub,
      shareToRow: shareToRowStub,
    },
    "./user": {
      USER_CONSTRAINTS,
      USER_SHEET_NAME,
      rowToUser: rowToUserStub,
      userToRow: userToRowStub,
    },
    "../../../utils/logger": { logger },
  });
}

// tests

test("data/data-providers/google-sheets/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("GoogleSheetsDataProvider", async (t) => {
    t.test("constructor", async (t) => {
      t.test("sets up initial state", async (t) => {
        const { GoogleSheetsDataProvider } = importModule(t);

        const result = new GoogleSheetsDataProvider();

        t.equal(result._initialized, false);
      });
    });

    t.test("instance methods", async (t) => {
      let provider: GoogleSheetsDataProvider;

      t.beforeEach(async () => {
        const { GoogleSheetsDataProvider } = importModule(t);
        provider = new GoogleSheetsDataProvider();
      });

      t.test("initialize", async (t) => {
        t.test("logs that initialization was done", async (t) => {
          await provider.initialize();

          t.ok(logger.info.called);
        });

        t.test("ensures that initialization only happens once", async (t) => {
          await provider.initialize();
          sinon.resetHistory();

          await provider.initialize();

          t.notOk(logger.info.called);
        });
      });

      t.test("getUserCount", async (t) => {
        t.test("counts rows in the users sheet", async (t) => {
          try {
            await provider.getUserCount();
          } catch {}

          t.ok(countRowsStub.called);
          t.equal(countRowsStub.firstCall.firstArg, USER_SHEET_NAME);
        });

        t.test("returns expected count", async (t) => {
          countRowsStub.resolves(42);

          const result = await provider.getUserCount();

          t.equal(result, 42);
        });
      });

      t.test("findUserById", async (t) => {
        t.test("finds a row in the users sheet by id", async (t) => {
          try {
            await provider.findUserById("user-id");
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], USER_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ id: "user-id" }));
          t.notOk(predicate({ id: "not-user-id" }));
        });

        t.test("when the user row exists", async (t) => {
          const row = {};

          t.beforeEach(async () => {
            findRowStub.resolves({ row });
          });

          t.test("converts it to a user object", async (t) => {
            try {
              await provider.findUserById("user-id");
            } catch {}

            t.ok(rowToUserStub.called);
            t.equal(rowToUserStub.firstCall.firstArg, row);
          });

          t.test("returns the user object", async (t) => {
            const user = {};
            rowToUserStub.returns(user);

            const result = await provider.findUserById("user-id");

            t.equal(result, user);
          });
        });

        t.test(
          "if the user row does not exist, returns undefined",
          async (t) => {
            const row = undefined;
            findRowStub.resolves({ row });

            const result = await provider.findUserById("user-id");

            t.equal(result, undefined);
          }
        );
      });

      t.test("findUserByName", async (t) => {
        t.test("finds a row in the users sheet by username", async (t) => {
          try {
            await provider.findUserByName("jim");
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], USER_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ username: "jim" }));
          t.notOk(predicate({ username: "not-jim" }));
        });

        t.test("when the user row exists", async (t) => {
          const row = {};

          t.beforeEach(async () => {
            findRowStub.resolves({ row });
          });

          t.test("converts it to a user object", async (t) => {
            try {
              await provider.findUserByName("user-id");
            } catch {}

            t.ok(rowToUserStub.called);
            t.equal(rowToUserStub.firstCall.firstArg, row);
          });

          t.test("returns the user object", async (t) => {
            const user = {};
            rowToUserStub.returns(user);

            const result = await provider.findUserByName("user-id");

            t.equal(result, user);
          });
        });

        t.test("if a user is not found, returns undefined", async (t) => {
          const row = undefined;
          findRowStub.resolves({ row });

          const result = await provider.findUserByName("user-id");

          t.equal(result, undefined);
        });
      });

      t.test("insertUser", async (t) => {
        const user = testUser1();

        t.test("converts the user object to a row", async (t) => {
          try {
            await provider.insertUser(user);
          } catch {}

          t.ok(userToRowStub.called);
          t.equal(userToRowStub.firstCall.firstArg, user);
        });

        t.test("inserts the row into the users sheet", async (t) => {
          const newRow = {};
          userToRowStub.returns(newRow);

          try {
            await provider.insertUser(user);
          } catch {}

          t.ok(insertRowStub.called);
          t.equal(insertRowStub.firstCall.args[0], USER_SHEET_NAME);
          t.equal(insertRowStub.firstCall.args[1], newRow);
          t.equal(insertRowStub.firstCall.args[2], USER_CONSTRAINTS);
        });

        t.test("converts the returned row to a user object", async (t) => {
          const newRow = {};
          userToRowStub.returns(newRow);
          const insertedRow = {};
          insertRowStub.resolves({ insertedRow });

          try {
            await provider.insertUser(user);
          } catch {}

          t.ok(rowToUserStub.called);
          t.equal(rowToUserStub.firstCall.firstArg, insertedRow);
        });

        t.test("returns the inserted user", async (t) => {
          const newRow = {};
          userToRowStub.returns(newRow);
          const insertedRow = {};
          insertRowStub.resolves({ insertedRow });
          const insertedUser = testUser1();
          rowToUserStub.returns(insertedUser);

          const result = await provider.insertUser(user);

          t.equal(result, insertedUser);
        });
      });

      t.test("updateUser", async (t) => {
        t.test("updates the expected row in the users sheet", async (t) => {
          const user = testUser1();

          await provider.updateUser(user);

          t.ok(updateRowStub.called);
          t.equal(updateRowStub.firstCall.args[0], USER_SHEET_NAME);
          const predicate: (r: any) => boolean =
            updateRowStub.firstCall.args[1];
          t.ok(predicate({ id: "123abc" }));
          t.notOk(predicate({ id: "not-123abc" }));
          t.same(updateRowStub.firstCall.args[2], {
            display_name: "Bob User",
          });
          t.equal(updateRowStub.firstCall.args[3], USER_CONSTRAINTS);
        });
      });

      t.test("findCredentialById", async (t) => {
        t.test("finds a row in the credentials sheet by id", async (t) => {
          try {
            await provider.findCredentialById("cred-id");
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], CREDENTIAL_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ id: "cred-id" }));
          t.notOk(predicate({ id: "not-cred-id" }));
        });

        t.test("when the credential row exists", async (t) => {
          const credentialRow = { id: "cred-id", user_id: "user-id" };

          t.beforeEach(async () => {
            findRowStub.onFirstCall().resolves({ row: credentialRow });
          });

          t.test(
            "finds the associated user row in the users sheet",
            async (t) => {
              try {
                await provider.findCredentialById("cred-id");
              } catch {}

              t.ok(findRowStub.called);
              t.equal(findRowStub.secondCall.args[0], USER_SHEET_NAME);
              const predicate: (r: any) => boolean =
                findRowStub.secondCall.args[1];
              t.ok(predicate({ id: "user-id" }));
              t.notOk(predicate({ id: "not-user-id" }));
            }
          );

          t.test(
            "if the user row doesn't exist, throws expected error",
            async (t) => {
              findRowStub.onSecondCall().resolves({ row: undefined });

              t.rejects(() => provider.findCredentialById("cred-id"), {
                message:
                  "Data integrity error: user 'user-id' no longer exists for credential 'cred-id'",
              });
            }
          );

          t.test("when the user row does exist", async (t) => {
            const userRow = {};

            t.beforeEach(async () => {
              findRowStub.onSecondCall().resolves({ row: userRow });
            });

            t.test("converts it to a credential object", async (t) => {
              try {
                await provider.findCredentialById("cred-id");
              } catch {}

              t.ok(rowToCredentialStub.called);
              t.equal(rowToCredentialStub.firstCall.args[0], credentialRow);
              t.equal(rowToCredentialStub.firstCall.args[1], userRow);
            });

            t.test("returns the credential object", async (t) => {
              const credential = {};
              rowToCredentialStub.returns(credential);

              const result = await provider.findCredentialById("cred-id");

              t.equal(result, credential);
            });
          });
        });

        t.test(
          "if the credential row does not exist, returns undefined",
          async (t) => {
            findRowStub.onFirstCall().resolves({ row: undefined });

            const result = await provider.findCredentialById("cred-id");

            t.equal(result, undefined);
          }
        );
      });

      t.test("findUserCredential", async (t) => {
        t.test(
          "finds a row in the credentials sheet and the users sheet by id",
          async (t) => {
            try {
              await provider.findUserCredential("user-id", "cred-id");
            } catch {}

            t.ok(findRowStub.called);
            t.equal(findRowStub.firstCall.args[0], USER_SHEET_NAME);
            const userPredicate: (r: any) => boolean =
              findRowStub.firstCall.args[1];
            t.ok(userPredicate({ id: "user-id" }));
            t.notOk(userPredicate({ id: "not-user-id" }));
            t.equal(findRowStub.secondCall.args[0], CREDENTIAL_SHEET_NAME);
            const credentialPredicate: (r: any) => boolean =
              findRowStub.secondCall.args[1];
            t.ok(credentialPredicate({ id: "cred-id", user_id: "user-id" }));
            t.notOk(
              credentialPredicate({ id: "not-cred-id", user_id: "user-id" })
            );
            t.notOk(
              credentialPredicate({ id: "cred-id", user_id: "not-user-id" })
            );
          }
        );

        t.test("when both the user row and credential row exist", async (t) => {
          const userRow = {};
          const credentialRow = { id: "cred-id", user_id: "user-id" };

          t.beforeEach(async () => {
            findRowStub.onFirstCall().resolves({ row: userRow });
            findRowStub.onSecondCall().resolves({ row: credentialRow });
          });

          t.test("converts them to a credential object", async (t) => {
            try {
              await provider.findUserCredential("user-id", "cred-id");
            } catch {}

            t.ok(rowToCredentialStub.called);
            t.equal(rowToCredentialStub.firstCall.args[0], credentialRow);
            t.equal(rowToCredentialStub.firstCall.args[1], userRow);
          });

          t.test("returns the credential object", async (t) => {
            const credential = {};
            rowToCredentialStub.returns(credential);

            const result = await provider.findUserCredential(
              "user-id",
              "cred-id"
            );

            t.equal(result, credential);
          });
        });

        t.test("if no rows exist, returns nothing", async (t) => {
          findRowStub.onFirstCall().resolves({ row: undefined });
          findRowStub.onSecondCall().resolves({ row: undefined });

          const result = await provider.findUserCredential(
            "user-id",
            "cred-id"
          );

          t.equal(result, undefined);
        });
      });

      t.test("findCredentialsByUser", async (t) => {
        t.test(
          "finds rows in the credentials sheet and a row in the users sheet by user id",
          async (t) => {
            try {
              await provider.findCredentialsByUser("user-id");
            } catch {}

            t.ok(findRowStub.called);
            t.equal(findRowStub.firstCall.args[0], USER_SHEET_NAME);
            const userPredicate: (r: any) => boolean =
              findRowStub.firstCall.args[1];
            t.ok(userPredicate({ id: "user-id" }));
            t.notOk(userPredicate({ id: "not-user-id" }));

            t.ok(findRowsStub.called);
            t.equal(findRowsStub.firstCall.args[0], CREDENTIAL_SHEET_NAME);
            const credentialPredicate: (r: any) => boolean =
              findRowsStub.firstCall.args[1];
            t.ok(credentialPredicate({ user_id: "user-id" }));
            t.notOk(credentialPredicate({ user_id: "not-user-id" }));
          }
        );

        t.test("when a user row and credential rows exist", async (t) => {
          const userRow = {};
          const credentialRow1 = { id: "cred-id-1", user_id: "user-id" };
          const credentialRow2 = { id: "cred-id-2", user_id: "user-id" };
          const credentialRow3 = { id: "cred-id-3", user_id: "user-id" };

          t.beforeEach(async () => {
            findRowStub.resolves({ row: userRow });
            findRowsStub.resolves({
              rows: [credentialRow1, credentialRow2, credentialRow3],
            });
          });

          t.test(
            "converts them to a series of credential objects",
            async (t) => {
              try {
                await provider.findCredentialsByUser("user-id");
              } catch {}

              t.ok(rowToCredentialStub.called);
              const calls = rowToCredentialStub.getCalls();

              t.equal(calls[0].args[0], credentialRow1);
              t.equal(calls[0].args[1], userRow);
              t.equal(calls[1].args[0], credentialRow2);
              t.equal(calls[1].args[1], userRow);
              t.equal(calls[2].args[0], credentialRow3);
              t.equal(calls[2].args[1], userRow);
            }
          );

          t.test(
            "returns the expected array of credential objects",
            async (t) => {
              const credential1 = {};
              const credential2 = {};
              const credential3 = {};
              rowToCredentialStub.onCall(0).returns(credential1);
              rowToCredentialStub.onCall(1).returns(credential2);
              rowToCredentialStub.onCall(2).returns(credential3);

              const result = await provider.findCredentialsByUser("user-id");

              t.ok(result);
              t.equal(result[0], credential1);
              t.equal(result[1], credential2);
              t.equal(result[2], credential3);
            }
          );
        });

        t.test("if no rows exist, returns an empty array", async (t) => {
          findRowStub.resolves({ row: undefined });
          findRowsStub.resolves({
            rows: [],
          });

          const result = await provider.findCredentialsByUser("user-id");

          t.same(result, []);
        });
      });

      t.test("insertCredential", async (t) => {
        const credential = testCredential1();

        t.test("finds a row in the users sheet by id", async (t) => {
          try {
            await provider.insertCredential("user-id", credential);
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], USER_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ id: "user-id" }));
          t.notOk(predicate({ id: "not-user-id" }));
        });

        t.test(
          "if user row does not exist, throws expected error",
          async (t) => {
            findRowStub.resolves({ row: undefined });

            t.rejects(() => provider.insertCredential("user-id", credential), {
              message: "User does not exist",
            });
          }
        );

        t.test("when the user row exists", async (t) => {
          const userRow = {};

          t.beforeEach(async () => {
            findRowStub.resolves({ row: userRow });
          });

          t.test("converts the credential object to a row", async (t) => {
            try {
              await provider.insertCredential("user-id", credential);
            } catch {}

            t.ok(credentialToRowStub.called);
            t.equal(credentialToRowStub.firstCall.args[0], credential);
            t.equal(credentialToRowStub.firstCall.args[1], "user-id");
          });

          t.test(
            "inserts the credential row into the credentials sheet",
            async (t) => {
              const credentialRow = {};
              credentialToRowStub.returns(credentialRow);

              await provider.insertCredential("user-id", credential);

              t.ok(insertRowStub.called);
              t.equal(insertRowStub.firstCall.args[0], CREDENTIAL_SHEET_NAME);
              t.equal(insertRowStub.firstCall.args[1], credentialRow);
              t.equal(insertRowStub.firstCall.args[2], CREDENTIAL_CONSTRAINTS);
            }
          );
        });
      });

      t.test("deleteCredential", async (t) => {
        t.test(
          "deletes the specified credential from the credentials sheet",
          async (t) => {
            try {
              await provider.deleteCredential("cred-id");
            } catch {}

            t.ok(deleteRowStub.called);
            t.equal(deleteRowStub.firstCall.args[0], CREDENTIAL_SHEET_NAME);
            const predicate: (r: any) => boolean =
              deleteRowStub.firstCall.args[1];
            t.ok(predicate({ id: "cred-id" }));
            t.notOk(predicate({ id: "not-cred-id" }));
          }
        );
      });

      t.test("findInviteById", async (t) => {
        t.test("finds a row in the invites sheet by id", async (t) => {
          try {
            await provider.findInviteById("invite-id");
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], INVITE_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ id: "invite-id" }));
          t.notOk(predicate({ id: "not-invite-id" }));
        });

        t.test("when the invite row exists", async (t) => {
          let inviteRow: RowData = {};

          t.beforeEach(async () => {
            findRowStub.resolves({ row: inviteRow });
          });

          t.test("when the invite has not been claimed", async (t) => {
            inviteRow = {
              created_by: "created-by-user-id",
            };

            t.test(
              "finds key rows in the users sheet that do not include the claiming user",
              async (t) => {
                try {
                  await provider.findInviteById("invite-id");
                } catch {}

                t.ok(findKeyRowsStub.called);
                t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
                const selector: (r: any) => any =
                  findKeyRowsStub.firstCall.args[1];
                t.equal(selector({ id: "user-id" }), "user-id");
                t.same(findKeyRowsStub.firstCall.args[2], [
                  "created-by-user-id",
                ]);
              }
            );

            t.test("converts the two rows to an invite object", async (t) => {
              const createdByRow = {};
              const claimedByRow = {};
              findKeyRowsStub.resolves({
                rowsByKey: { "created-by-user-id": createdByRow },
              });

              try {
                await provider.findInviteById("invite-id");
              } catch {}

              t.ok(rowToInviteStub.called);
              t.equal(rowToInviteStub.firstCall.args[0], inviteRow);
              t.equal(rowToInviteStub.firstCall.args[1], createdByRow);
              t.equal(rowToInviteStub.firstCall.args[2], undefined);
            });
          });

          t.test("when the invite has been claimed", async (t) => {
            inviteRow = {
              created_by: "created-by-user-id",
              claimed_by: "claimed-by-user-id",
            };

            t.test(
              "finds key rows in the users sheet that include the claiming user",
              async (t) => {
                try {
                  await provider.findInviteById("invite-id");
                } catch {}

                t.ok(findKeyRowsStub.called);
                t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
                const selector: (r: any) => any =
                  findKeyRowsStub.firstCall.args[1];
                t.equal(selector({ id: "user-id" }), "user-id");
                t.same(findKeyRowsStub.firstCall.args[2], [
                  "created-by-user-id",
                  "claimed-by-user-id",
                ]);
              }
            );

            t.test("converts the three rows to an invite object", async (t) => {
              const createdByRow = {};
              const claimedByRow = {};
              findKeyRowsStub.resolves({
                rowsByKey: {
                  "created-by-user-id": createdByRow,
                  "claimed-by-user-id": claimedByRow,
                },
              });

              try {
                await provider.findInviteById("invite-id");
              } catch {}

              t.ok(rowToInviteStub.called);
              t.equal(rowToInviteStub.firstCall.args[0], inviteRow);
              t.equal(rowToInviteStub.firstCall.args[1], createdByRow);
              t.equal(rowToInviteStub.firstCall.args[2], claimedByRow);
            });
          });

          t.test("returns the invite object", async (t) => {
            findKeyRowsStub.resolves({
              rowsByKey: {},
            });
            const invite = {};
            rowToInviteStub.returns(invite);

            const result = await provider.findInviteById("invite-id");

            t.equal(result, invite);
          });
        });

        t.test(
          "if the invite row doesn't exists, returns nothing",
          async (t) => {
            findRowStub.resolves({ row: undefined });

            const result = await provider.findInviteById("invite-id");

            t.equal(result, undefined);
          }
        );
      });

      t.test("insertInvite", async (t) => {
        const invite = testInvite1(testUser2());

        t.test("converts the invite to rows", async (t) => {
          try {
            await provider.insertInvite(invite);
          } catch {}

          t.ok(inviteToRowStub.called);
          t.equal(inviteToRowStub.firstCall.args[0], invite);
        });

        t.test("inserts the invite row into the invites sheet", async (t) => {
          const inviteRow = {};
          inviteToRowStub.returns({ inviteRow });

          try {
            await provider.insertInvite(invite);
          } catch {}

          t.ok(insertRowStub.called);
          t.equal(insertRowStub.firstCall.args[0], INVITE_SHEET_NAME);
          t.equal(insertRowStub.firstCall.args[1], inviteRow);
          t.equal(insertRowStub.firstCall.args[2], INVITE_CONSTRAINTS);
        });

        t.test(
          "converts the resulting invite row and user rows back to an invite",
          async (t) => {
            const createdByRow = {};
            const claimedByRow = {};
            inviteToRowStub.returns({ createdByRow, claimedByRow });
            const insertedRow = {};
            insertRowStub.resolves({ insertedRow });

            try {
              await provider.insertInvite(invite);
            } catch {}

            t.ok(rowToInviteStub.called);
            t.equal(rowToInviteStub.firstCall.args[0], insertedRow);
            t.equal(rowToInviteStub.firstCall.args[1], createdByRow);
            t.equal(rowToInviteStub.firstCall.args[2], claimedByRow);
          }
        );

        t.test("returns the new invite", async (t) => {
          const createdByRow = {};
          const claimedByRow = {};
          inviteToRowStub.returns({ createdByRow, claimedByRow });
          const insertedRow = {};
          insertRowStub.resolves({ insertedRow });
          const newInvite = {};
          rowToInviteStub.returns(newInvite);

          const result = await provider.insertInvite(invite);

          t.equal(result, newInvite);
        });
      });

      t.test("updateInvite", async (t) => {
        t.test("when the invite is not claimed", async (t) => {
          const invite = testInvite1(testUser2());

          t.test(
            "updates the existing invite row in the invites sheet",
            async (t) => {
              await provider.updateInvite(invite);

              t.ok(updateRowStub.called);
              t.equal(updateRowStub.firstCall.args[0], INVITE_SHEET_NAME);
              const predicate: (r: any) => boolean =
                updateRowStub.firstCall.args[1];
              t.ok(predicate({ id: "INVITE_1" }));
              t.notOk(predicate({ id: "not-INVITE_1" }));
              t.same(updateRowStub.firstCall.args[2], {
                claimed_by: undefined,
                claimed: undefined,
              });
            }
          );
        });

        t.test("when the invite is claimed", async (t) => {
          const claimedBy = testUser1();
          const invite = testInvite1(testUser2(), claimedBy);

          t.test(
            "updates the existing invite row in the invites sheet",
            async (t) => {
              await provider.updateInvite(invite);

              t.ok(updateRowStub.called);
              t.equal(updateRowStub.firstCall.args[0], INVITE_SHEET_NAME);
              const predicate: (r: any) => boolean =
                updateRowStub.firstCall.args[1];
              t.ok(predicate({ id: "INVITE_1" }));
              t.notOk(predicate({ id: "not-INVITE_1" }));
              t.same(updateRowStub.firstCall.args[2], {
                claimed_by: "123abc",
                claimed: "2023-01-02T00:00:00.000Z",
              });
            }
          );
        });
      });

      t.test("findShareById", async (t) => {
        t.test("finds a row in the shares sheet by id", async (t) => {
          try {
            await provider.findShareById("share-id");
          } catch {}

          t.ok(findRowStub.called);
          t.equal(findRowStub.firstCall.args[0], SHARE_SHEET_NAME);
          const predicate: (r: any) => boolean = findRowStub.firstCall.args[1];
          t.ok(predicate({ id: "share-id" }));
          t.notOk(predicate({ id: "not-share-id" }));
        });

        t.test("when the share row exists", async (t) => {
          let shareRow: RowData = {};

          t.beforeEach(async () => {
            findRowStub.resolves({ row: shareRow });
          });

          t.test("when the share has not been claimed", async (t) => {
            shareRow = {
              created_by: "created-by-user-id",
            };

            t.test(
              "finds key rows in the users sheet that do not include the claiming user",
              async (t) => {
                try {
                  await provider.findShareById("share-id");
                } catch {}

                t.ok(findKeyRowsStub.called);
                t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
                const selector: (r: any) => any =
                  findKeyRowsStub.firstCall.args[1];
                t.equal(selector({ id: "user-id" }), "user-id");
                t.same(findKeyRowsStub.firstCall.args[2], [
                  "created-by-user-id",
                ]);
              }
            );

            t.test("converts the two rows to an share object", async (t) => {
              const createdByRow = {};
              findKeyRowsStub.resolves({
                rowsByKey: { "created-by-user-id": createdByRow },
              });

              try {
                await provider.findShareById("share-id");
              } catch {}

              t.ok(rowToShareStub.called);
              t.equal(rowToShareStub.firstCall.args[0], shareRow);
              t.equal(rowToShareStub.firstCall.args[1], createdByRow);
              t.equal(rowToShareStub.firstCall.args[2], undefined);
            });
          });

          t.test("when the share has been claimed", async (t) => {
            shareRow = {
              created_by: "created-by-user-id",
              claimed_by: "claimed-by-user-id",
            };

            t.test(
              "finds key rows in the users sheet that include the claiming user",
              async (t) => {
                try {
                  await provider.findShareById("share-id");
                } catch {}

                t.ok(findKeyRowsStub.called);
                t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
                const selector: (r: any) => any =
                  findKeyRowsStub.firstCall.args[1];
                t.equal(selector({ id: "user-id" }), "user-id");
                t.same(findKeyRowsStub.firstCall.args[2], [
                  "created-by-user-id",
                  "claimed-by-user-id",
                ]);
              }
            );

            t.test("converts the three rows to an share object", async (t) => {
              const createdByRow = {};
              const claimedByRow = {};
              findKeyRowsStub.resolves({
                rowsByKey: {
                  "created-by-user-id": createdByRow,
                  "claimed-by-user-id": claimedByRow,
                },
              });

              try {
                await provider.findShareById("share-id");
              } catch {}

              t.ok(rowToShareStub.called);
              t.equal(rowToShareStub.firstCall.args[0], shareRow);
              t.equal(rowToShareStub.firstCall.args[1], createdByRow);
              t.equal(rowToShareStub.firstCall.args[2], claimedByRow);
            });
          });

          t.test("returns the share object", async (t) => {
            findKeyRowsStub.resolves({
              rowsByKey: {},
            });
            const share = {};
            rowToShareStub.returns(share);

            const result = await provider.findShareById("share-id");

            t.equal(result, share);
          });
        });

        t.test(
          "if the share row doesn't exists, returns nothing",
          async (t) => {
            findRowStub.resolves({ row: undefined });

            const result = await provider.findShareById("share-id");

            t.equal(result, undefined);
          }
        );
      });

      t.test("findSharesByClaimedUserId", async (t) => {
        t.test(
          "finds rows in the shares sheet by claimed user id",
          async (t) => {
            try {
              await provider.findSharesByClaimedUserId("user-id");
            } catch {}

            t.ok(findRowsStub.called);
            t.equal(findRowsStub.firstCall.args[0], SHARE_SHEET_NAME);
            const predicate: (r: any) => boolean =
              findRowsStub.firstCall.args[1];
            t.ok(predicate({ claimed_by: "user-id" }));
            t.notOk(predicate({ claimed_by: "not-user-id" }));
          }
        );

        t.test(
          "finds key rows in the users sheet that include both creating and claiming users",
          async (t) => {
            findRowsStub.resolves({
              rows: [
                { created_by: "user-id-1", claimed_by: "user-id" },
                { created_by: "user-id-2", claimed_by: "user-id" },
                { created_by: "user-id-3", claimed_by: "user-id" },
              ],
            });

            try {
              await provider.findSharesByClaimedUserId("user-id");
            } catch {}

            t.ok(findKeyRowsStub.called);
            t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
            const selector: (r: any) => any = findKeyRowsStub.firstCall.args[1];
            t.equal(selector({ id: "user-id" }), "user-id");
            t.same(findKeyRowsStub.firstCall.args[2], [
              "user-id-1",
              "user-id",
              "user-id-2",
              "user-id",
              "user-id-3",
              "user-id",
            ]);
          }
        );

        t.test(
          "converts the share rows and user rows to a sequence of share objects",
          async (t) => {
            const shareRow1 = {
              created_by: "user-id-1",
              claimed_by: "user-id",
            };
            const shareRow2 = {
              created_by: "user-id-2",
              claimed_by: "user-id",
            };
            const shareRow3 = {
              created_by: "user-id-3",
              claimed_by: "user-id",
            };
            findRowsStub.resolves({
              rows: [shareRow1, shareRow2, shareRow3],
            });
            const claimedByRow = {};
            const createdBy1Row = {};
            const createdBy2Row = {};
            const createdBy3Row = {};
            findKeyRowsStub.resolves({
              rowsByKey: {
                "user-id": claimedByRow,
                "user-id-1": createdBy1Row,
                "user-id-2": createdBy2Row,
                "user-id-3": createdBy3Row,
              },
            });

            try {
              await provider.findSharesByClaimedUserId("user-id");
            } catch {}

            t.ok(rowToShareStub.called);
            const calls = rowToShareStub.getCalls();
            t.equal(calls[0].args[0], shareRow1);
            t.equal(calls[0].args[1], createdBy1Row);
            t.equal(calls[0].args[2], claimedByRow);
            t.equal(calls[1].args[0], shareRow2);
            t.equal(calls[1].args[1], createdBy2Row);
            t.equal(calls[1].args[2], claimedByRow);
            t.equal(calls[2].args[0], shareRow3);
            t.equal(calls[2].args[1], createdBy3Row);
            t.equal(calls[2].args[2], claimedByRow);
          }
        );

        t.test("returns the array of share objects", async (t) => {
          const shareRow1 = {
            created_by: "user-id-1",
            claimed_by: "user-id",
          };
          const shareRow2 = {
            created_by: "user-id-2",
            claimed_by: "user-id",
          };
          const shareRow3 = {
            created_by: "user-id-3",
            claimed_by: "user-id",
          };
          findRowsStub.resolves({
            rows: [shareRow1, shareRow2, shareRow3],
          });
          const claimedByRow = {};
          const createdBy1Row = {};
          const createdBy2Row = {};
          const createdBy3Row = {};
          findKeyRowsStub.resolves({
            rowsByKey: {
              "user-id": claimedByRow,
              "user-id-1": createdBy1Row,
              "user-id-2": createdBy2Row,
              "user-id-3": createdBy3Row,
            },
          });
          const share1 = {};
          rowToShareStub.onCall(0).returns(share1);
          const share2 = {};
          rowToShareStub.onCall(1).returns(share2);
          const share3 = {};
          rowToShareStub.onCall(2).returns(share3);

          const result = await provider.findSharesByClaimedUserId("user-id");

          t.ok(result);
          t.equal(result.length, 3);
          t.equal(result[0], share1);
          t.equal(result[1], share2);
          t.equal(result[2], share3);
        });
      });

      t.test("findSharesByCreatedUserId", async (t) => {
        t.test(
          "finds rows in the shares sheet by claimed user id",
          async (t) => {
            try {
              await provider.findSharesByCreatedUserId("user-id");
            } catch {}

            t.ok(findRowsStub.called);
            t.equal(findRowsStub.firstCall.args[0], SHARE_SHEET_NAME);
            const predicate: (r: any) => boolean =
              findRowsStub.firstCall.args[1];
            t.ok(predicate({ created_by: "user-id" }));
            t.notOk(predicate({ created_by: "not-user-id" }));
          }
        );

        t.test(
          "finds key rows in the users sheet that include both creating and claiming users",
          async (t) => {
            findRowsStub.resolves({
              rows: [
                { created_by: "user-id", claimed_by: "user-id-1" },
                { created_by: "user-id" },
                { created_by: "user-id", claimed_by: "user-id-2" },
              ],
            });

            try {
              await provider.findSharesByCreatedUserId("user-id");
            } catch {}

            t.ok(findKeyRowsStub.called);
            t.equal(findKeyRowsStub.firstCall.args[0], USER_SHEET_NAME);
            const selector: (r: any) => any = findKeyRowsStub.firstCall.args[1];
            t.equal(selector({ id: "user-id" }), "user-id");
            t.same(findKeyRowsStub.firstCall.args[2], [
              "user-id",
              "user-id-1",
              "user-id",
              "user-id",
              "user-id-2",
            ]);
          }
        );

        t.test(
          "converts the share rows and user rows to a sequence of share objects",
          async (t) => {
            const shareRow1 = {
              created_by: "user-id",
              claimed_by: "user-id-1",
            };
            const shareRow2 = {
              created_by: "user-id",
            };
            const shareRow3 = {
              created_by: "user-id",
              claimed_by: "user-id-2",
            };
            findRowsStub.resolves({
              rows: [shareRow1, shareRow2, shareRow3],
            });
            const createdByRow = {};
            const claimedBy1Row = {};
            const claimedBy2Row = {};
            findKeyRowsStub.resolves({
              rowsByKey: {
                "user-id": createdByRow,
                "user-id-1": claimedBy1Row,
                "user-id-2": claimedBy2Row,
              },
            });

            try {
              await provider.findSharesByCreatedUserId("user-id");
            } catch {}

            t.ok(rowToShareStub.called);
            const calls = rowToShareStub.getCalls();
            t.equal(calls[0].args[0], shareRow1);
            t.equal(calls[0].args[1], createdByRow);
            t.equal(calls[0].args[2], claimedBy1Row);
            t.equal(calls[1].args[0], shareRow2);
            t.equal(calls[1].args[1], createdByRow);
            t.equal(calls[1].args[2], undefined);
            t.equal(calls[2].args[0], shareRow3);
            t.equal(calls[2].args[1], createdByRow);
            t.equal(calls[2].args[2], claimedBy2Row);
          }
        );

        t.test("returns the array of share objects", async (t) => {
          const shareRow1 = {
            created_by: "user-id",
            claimed_by: "user-id-1",
          };
          const shareRow2 = {
            created_by: "user-id",
          };
          const shareRow3 = {
            created_by: "user-id",
            claimed_by: "user-id-2",
          };
          findRowsStub.resolves({
            rows: [shareRow1, shareRow2, shareRow3],
          });
          const createdByRow = {};
          const claimedBy1Row = {};
          const claimedBy2Row = {};
          findKeyRowsStub.resolves({
            rowsByKey: {
              "user-id": createdByRow,
              "user-id-1": claimedBy1Row,
              "user-id-2": claimedBy2Row,
            },
          });
          const share1 = {};
          rowToShareStub.onCall(0).returns(share1);
          const share2 = {};
          rowToShareStub.onCall(1).returns(share2);
          const share3 = {};
          rowToShareStub.onCall(2).returns(share3);

          const result = await provider.findSharesByCreatedUserId("user-id");

          t.ok(result);
          t.equal(result.length, 3);
          t.equal(result[0], share1);
          t.equal(result[1], share2);
          t.equal(result[2], share3);
        });
      });

      t.test("insertShare", async (t) => {
        const share = testShare1(testUser2());

        t.test("converts the share to rows", async (t) => {
          try {
            await provider.insertShare(share);
          } catch {}

          t.ok(shareToRowStub.called);
          t.equal(shareToRowStub.firstCall.args[0], share);
        });

        t.test("inserts the share row into the shares sheet", async (t) => {
          const shareRow = {};
          shareToRowStub.returns({ shareRow });

          try {
            await provider.insertShare(share);
          } catch {}

          t.ok(insertRowStub.called);
          t.equal(insertRowStub.firstCall.args[0], SHARE_SHEET_NAME);
          t.equal(insertRowStub.firstCall.args[1], shareRow);
          t.equal(insertRowStub.firstCall.args[2], SHARE_CONSTRAINTS);
        });

        t.test(
          "converts the resulting share row and user rows back to a share",
          async (t) => {
            const createdByRow = {};
            const claimedByRow = {};
            shareToRowStub.returns({ createdByRow, claimedByRow });
            const insertedRow = {};
            insertRowStub.resolves({ insertedRow });

            try {
              await provider.insertShare(share);
            } catch {}

            t.ok(rowToShareStub.called);
            t.equal(rowToShareStub.firstCall.args[0], insertedRow);
            t.equal(rowToShareStub.firstCall.args[1], createdByRow);
            t.equal(rowToShareStub.firstCall.args[2], claimedByRow);
          }
        );

        t.test("returns the new share", async (t) => {
          const createdByRow = {};
          const claimedByRow = {};
          shareToRowStub.returns({ createdByRow, claimedByRow });
          const insertedRow = {};
          insertRowStub.resolves({ insertedRow });
          const newShare = {};
          rowToShareStub.returns(newShare);

          const result = await provider.insertShare(share);

          t.equal(result, newShare);
        });
      });

      t.test("updateShare", async (t) => {
        t.test("when the invite is not claimed", async (t) => {
          const share = testShare1(testUser2());

          t.test(
            "updates the existing invite row in the invites sheet",
            async (t) => {
              await provider.updateShare(share);

              t.ok(updateRowStub.called);
              t.equal(updateRowStub.firstCall.args[0], SHARE_SHEET_NAME);
              const predicate: (r: any) => boolean =
                updateRowStub.firstCall.args[1];
              t.ok(predicate({ id: "SHARE_1" }));
              t.notOk(predicate({ id: "not-SHARE_1" }));
              t.same(updateRowStub.firstCall.args[2], {
                claimed_by: undefined,
                claimed: undefined,
              });
            }
          );
        });

        t.test("when the invite is claimed", async (t) => {
          const claimedBy = testUser1();
          const share = testShare1(testUser2(), { claimedBy });

          t.test(
            "updates the existing invite row in the invites sheet",
            async (t) => {
              await provider.updateShare(share);

              t.ok(updateRowStub.called);
              t.equal(updateRowStub.firstCall.args[0], SHARE_SHEET_NAME);
              const predicate: (r: any) => boolean =
                updateRowStub.firstCall.args[1];
              t.ok(predicate({ id: "SHARE_1" }));
              t.notOk(predicate({ id: "not-SHARE_1" }));
              t.same(updateRowStub.firstCall.args[2], {
                claimed_by: "123abc",
                claimed: "2023-01-02T00:00:00.000Z",
              });
            }
          );
        });
      });
    });
  });
});
