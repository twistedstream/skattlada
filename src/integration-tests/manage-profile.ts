import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { LocalFileProvider } from "../data/file-providers/local";
import { testCredential1, testUser1 } from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doSignIn,
  navigatePage,
  postForm,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Manage profile", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  const fileProvider = new LocalFileProvider();
  await fileProvider.initialize();
  const user1 = testUser1();
  const cred1 = testCredential1();

  // start with an already registered user
  const state = await createIntegrationTestState(t, fileProvider, {
    users: [user1],
    credentials: [{ ...cred1, user: user1 }],
    invites: [],
    shares: [],
  });

  t.test("Initial data state", async (t) => {
    // we should have an existing user and cred
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
  });

  t.test("Sign in with existing passkey", async (t) => {
    await doSignIn(t, state, user1.username, cred1);
  });

  t.test("Go to profile page", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertHtmlResponse(t, response);
  });

  t.test("Update user's profile (display name)", async (t) => {
    const response = await postForm(state, "/profile", {
      csrf_token: state.csrfToken,
      action: "update_profile",
      display_name: "Bob User 2",
    });

    assertRedirectResponse(t, response, "/");

    // Bob's user profile should be updated
    assertUserAndAssociatedCredentials(
      t,
      state,
      testUser1().username,
      "Bob User 2",
      []
    );
  });
});
