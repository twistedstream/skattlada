import sinon from "sinon";
import { test } from "tap";

import { testNowDate } from "../../utils/testing/data";

// test objects

const dataProvider = {
  insertCredential: sinon.stub(),
  insertUser: sinon.stub(),
  updateUser: sinon.stub(),
  findCredentialById: sinon.stub(),
  findUserById: sinon.stub(),
  findUserByName: sinon.stub(),
  findUserCredential: sinon.stub(),
  findCredentialsByUser: sinon.stub(),
  deleteCredential: sinon.stub(),
};

const validateUserFake = sinon.fake();
const uniqueStub = sinon.stub();
const nowFake = sinon.fake.returns(testNowDate);

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "../../data": { getDataProvider: () => dataProvider },
    "../../utils/identifier": { unique: uniqueStub },
    "../../utils/time": { now: nowFake },
    "./validation": {
      validateUser: validateUserFake,
    },
  });
}

//tests

test("services/user", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fetchUserById", async (t) => {
    let fetchUserById: any;

    t.beforeEach(async () => {
      fetchUserById = importModule(t).fetchUserById;
    });

    t.test("finds the user by ID", async (t) => {
      try {
        await fetchUserById("user-id");
      } catch {}

      t.ok(dataProvider.findUserById.called);
      t.equal(dataProvider.findUserById.firstCall.firstArg, "user-id");
    });

    t.test("returns the found user", async (t) => {
      const user = {};
      dataProvider.findUserById.resolves(user);

      const result = await fetchUserById("invite-id");

      t.ok(result);
      t.equal(result, user);
    });
  });

  t.test("fetchUserByName", async (t) => {
    let fetchUserByName: any;

    t.beforeEach(async () => {
      fetchUserByName = importModule(t).fetchUserByName;
    });

    t.test("finds the user by name", async (t) => {
      try {
        await fetchUserByName("bob");
      } catch {}

      t.ok(dataProvider.findUserByName.called);
      t.equal(dataProvider.findUserByName.firstCall.firstArg, "bob");
    });

    t.test("returns the found user", async (t) => {
      const user = {};
      dataProvider.findUserByName.resolves(user);

      const result = await fetchUserByName("bob");

      t.ok(result);
      t.equal(result, user);
    });
  });

  t.test("newUser", async (t) => {
    let newUser: any;

    t.beforeEach(async () => {
      newUser = importModule(t).newUser;
      uniqueStub.returns("user-id");
    });

    t.test("generates a unique ID", async (t) => {
      await newUser("bob", "Bob User");

      t.ok(uniqueStub.called);
      t.equal(uniqueStub.firstCall.args.length, 0);
    });

    t.test("sets created to now", async (t) => {
      await newUser("bob", "Bob User");

      t.ok(nowFake.called);
      t.equal(nowFake.firstCall.args.length, 0);
    });

    t.test("validates the user", async (t) => {
      await newUser("bob", "Bob User");

      t.ok(validateUserFake.called);
      t.same(validateUserFake.firstCall.firstArg, {
        id: "user-id",
        username: "bob",
        displayName: "Bob User",
        created: testNowDate,
        isAdmin: false,
      });
    });

    t.test("returns expected user data", async (t) => {
      const result = await newUser("bob", "Bob User");

      t.same(result, {
        id: "user-id",
        username: "bob",
        displayName: "Bob User",
        created: testNowDate,
        isAdmin: false,
      });
    });
  });

  t.test("registerUser", async (t) => {
    let registerUser: any;

    t.beforeEach(() => {
      registerUser = importModule(t).registerUser;
    });

    t.test("validates the user", async (t) => {
      const registeringUser = {};

      try {
        await registerUser(registeringUser, {});
      } catch {}

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user to the database", async (t) => {
      const registeringUser = {};

      try {
        await registerUser(registeringUser, {});
      } catch {}

      t.ok(dataProvider.insertUser.called);
      t.equal(dataProvider.insertUser.firstCall.firstArg, registeringUser);
    });

    t.test("adds the user credential to the database", async (t) => {
      const firstCredential = {};
      const addedUser = { id: "user-id" };
      dataProvider.insertUser.resolves(addedUser);

      try {
        await registerUser({}, firstCredential);
      } catch {}

      t.ok(dataProvider.insertCredential.called);
      t.equal(dataProvider.insertCredential.firstCall.args[0], "user-id");
      t.equal(dataProvider.insertCredential.firstCall.args[1], firstCredential);
    });

    t.test("returns the added user", async (t) => {
      const addedUser = { id: "user-id" };
      dataProvider.insertUser.resolves(addedUser);

      const result = await registerUser({}, {});

      t.equal(result, addedUser);
    });
  });

  t.test("modifyUser", async (t) => {
    let modifyUser: any;

    t.beforeEach(async () => {
      modifyUser = importModule(t).modifyUser;
    });

    t.test("validates the updated user data", async (t) => {
      const updatingUser = {};

      try {
        await modifyUser(updatingUser);
      } catch {}

      t.ok(validateUserFake.called);
      t.equal(validateUserFake.firstCall.firstArg, updatingUser);
    });

    t.test("finds the existing user", async (t) => {
      const updatingUser = { id: "user-id" };

      try {
        await modifyUser(updatingUser);
      } catch {}

      t.ok(dataProvider.findUserById.called);
      t.equal(dataProvider.findUserById.firstCall.firstArg, "user-id");
    });

    t.test("if user doesn't exist, throws expected error", async (t) => {
      const updatingUser = { id: "user-id" };
      dataProvider.findUserById.resolves(undefined);

      t.rejects(() => modifyUser(updatingUser), {
        message: "User with ID 'user-id' does not exist.",
      });
    });

    t.test("updates the user in the database", async (t) => {
      const updatingUser = { id: "user-id" };
      const foundUser = {};
      dataProvider.findUserById.resolves(foundUser);

      await modifyUser(updatingUser);

      t.ok(dataProvider.updateUser.called);
      t.equal(dataProvider.updateUser.firstCall.firstArg, updatingUser);
    });
  });

  t.test("fetchCredentialById", async (t) => {
    let fetchCredentialById: any;

    t.beforeEach(async () => {
      fetchCredentialById = importModule(t).fetchCredentialById;
    });

    t.test("finds the credential by ID", async (t) => {
      try {
        await fetchCredentialById("cred-id");
      } catch {}

      t.ok(dataProvider.findCredentialById.called);
      t.equal(dataProvider.findCredentialById.firstCall.firstArg, "cred-id");
    });

    t.test("returns the found credential", async (t) => {
      const cred = {};
      dataProvider.findCredentialById.resolves(cred);

      const result = await fetchCredentialById("cred-id");

      t.ok(result);
      t.equal(result, cred);
    });
  });

  t.test("fetchCredentialsByUserId", async (t) => {
    let fetchCredentialsByUserId: any;

    t.beforeEach(async () => {
      fetchCredentialsByUserId = importModule(t).fetchCredentialsByUserId;
    });

    t.test("finds the credentials by user ID", async (t) => {
      try {
        await fetchCredentialsByUserId("user-id");
      } catch {}

      t.ok(dataProvider.findCredentialsByUser.called);
      t.equal(dataProvider.findCredentialsByUser.firstCall.firstArg, "user-id");
    });

    t.test("returns the found credentials", async (t) => {
      const credentials = [{}, {}];
      dataProvider.findCredentialsByUser.resolves(credentials);

      const result = await fetchCredentialsByUserId("user-id");

      t.ok(result);
      t.equal(result, credentials);
    });
  });

  t.test("fetchCredentialsByUsername", async (t) => {
    let fetchCredentialsByUsername: any;

    t.beforeEach(async () => {
      fetchCredentialsByUsername = importModule(t).fetchCredentialsByUsername;
    });

    t.test("finds user by name", async (t) => {
      const foundUser = {};
      dataProvider.findUserByName.withArgs("bob").resolves(foundUser);

      try {
        await fetchCredentialsByUsername("bob");
      } catch {}

      t.ok(dataProvider.findUserByName.called);
      t.equal(dataProvider.findUserByName.firstCall.firstArg, "bob");
    });

    t.test("when user exists", async (t) => {
      t.beforeEach(async () => {
        dataProvider.findUserByName.resolves({ id: "user-id" });
      });

      t.test("finds credentials by user id", async (t) => {
        try {
          await fetchCredentialsByUsername("bob");
        } catch {}

        t.ok(dataProvider.findCredentialsByUser.called);
        t.equal(
          dataProvider.findCredentialsByUser.firstCall.firstArg,
          "user-id"
        );
      });

      t.test("returns found credentials", async (t) => {
        const credentials = [{}, {}];
        dataProvider.findCredentialsByUser.resolves(credentials);

        const result = await fetchCredentialsByUsername("bob");

        t.ok(result);
        t.equal(result, credentials);
      });
    });

    t.test("when user doesn't exist, returns no credentials", async (t) => {
      dataProvider.findUserByName.resolves(undefined);

      const result = await fetchCredentialsByUsername("bob");

      t.ok(result);
      t.same(result, []);
    });
  });

  t.test("addUserCredential", async (t) => {
    let addUserCredential: any;

    t.beforeEach(async () => {
      addUserCredential = importModule(t).addUserCredential;
    });

    t.test("finds user credential", async (t) => {
      try {
        await addUserCredential("user-id", { credentialID: "cred-id" });
      } catch {}

      t.ok(dataProvider.findUserCredential.called);
      t.equal(dataProvider.findUserCredential.firstCall.args[0], "user-id");
      t.equal(dataProvider.findUserCredential.firstCall.args[1], "cred-id");
    });

    t.test("if credential is found, throws expected error", async (t) => {
      dataProvider.findUserCredential.resolves({});

      t.rejects(
        () => addUserCredential("user-id", { credentialID: "cred-id" }),
        {
          message: "Credential with ID 'cred-id' already exists",
        }
      );
    });

    t.test("when credential doesn't exist", async (t) => {
      t.beforeEach(async () => {
        dataProvider.findUserCredential.resolves(undefined);
      });

      t.test("finds user by ID", async (t) => {
        try {
          await addUserCredential("user-id", { credentialID: "cred-id" });
        } catch {}

        t.ok(dataProvider.findUserById.called);
        t.equal(dataProvider.findUserById.firstCall.firstArg, "user-id");
      });

      t.test("if user not found, throws expected error", async (t) => {
        dataProvider.findUserById.resolves(undefined);

        t.rejects(
          () => addUserCredential("user-id", { credentialID: "cred-id" }),
          {
            message: "User with ID 'user-id' not found",
          }
        );
      });

      t.test("inserts credential for user", async (t) => {
        dataProvider.findUserById.resolves({});
        const credential = { credentialID: "cred-id" };

        await addUserCredential("user-id", credential);

        t.ok(dataProvider.insertCredential.called);
        t.equal(dataProvider.insertCredential.firstCall.args[0], "user-id");
        t.equal(dataProvider.insertCredential.firstCall.args[1], credential);
      });
    });
  });

  //TODO: next to refactor:

  t.test("removeUserCredential", async (t) => {
    let removeUserCredential: any;

    t.beforeEach(async () => {
      removeUserCredential = importModule(t).removeUserCredential;
    });

    t.test("finds user credential", async (t) => {
      try {
        await removeUserCredential("user-id", "cred-id");
      } catch {}

      t.ok(dataProvider.findUserCredential.called);
      t.equal(dataProvider.findUserCredential.firstCall.args[0], "user-id");
      t.equal(dataProvider.findUserCredential.firstCall.args[1], "cred-id");
    });

    t.test("if credential is not found, throws expected error", async (t) => {
      dataProvider.findUserCredential.resolves(undefined);

      t.rejects(() => removeUserCredential("user-id", "cred-id"), {
        message:
          "Credential with ID 'cred-id' not associated with user with ID 'user-id'",
      });
    });

    t.test("when credential exists", async (t) => {
      t.beforeEach(async () => {
        dataProvider.findUserCredential.resolves({});
      });

      t.test("finds all credentials by user", async (t) => {
        try {
          await removeUserCredential("user-id", "cred-id");
        } catch {}

        t.ok(dataProvider.findCredentialsByUser.called);
        t.equal(
          dataProvider.findCredentialsByUser.firstCall.firstArg,
          "user-id"
        );
      });

      t.test(
        "if only user credential exists, throws expected error",
        async (t) => {
          dataProvider.findCredentialsByUser.resolves(
            // only one
            [{}]
          );

          t.rejects(() => removeUserCredential("user-id", "cred-id"), {
            message:
              "Cannot remove the last credential with ID 'cred-id' associated with user with ID 'user-id'",
          });
        }
      );

      t.test("deletes credential", async (t) => {
        dataProvider.findCredentialsByUser.resolves(
          // more than one
          [{}, {}]
        );

        await removeUserCredential("user-id", "cred-id");

        t.ok(dataProvider.deleteCredential.called);
        t.equal(dataProvider.deleteCredential.firstCall.firstArg, "cred-id");
      });
    });
  });
});
