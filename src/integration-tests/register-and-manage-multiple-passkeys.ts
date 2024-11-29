import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { LocalFileProvider } from "../data/file-providers/local";
import {
  testCredential1,
  testCredential2,
  testUser1,
} from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertRedirectResponse,
  assertUserAndAssociatedCredentials,
  createIntegrationTestState,
  doRegistration,
  doSignIn,
  doSignOut,
  navigatePage,
  postForm,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Register and manage multiple authenticators", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  const fileProvider = new LocalFileProvider();
  await fileProvider.initialize();
  const user1 = testUser1();
  const cred1 = testCredential1();
  const cred2 = testCredential2();

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

  t.test("Register another passkey", async (t) => {
    await doRegistration(
      t,
      state,
      user1.username,
      user1.displayName,
      cred2,
      false,
    );

    // we should now have a second cred registered to the existing user
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 2);
    assertUserAndAssociatedCredentials(
      t,
      state,
      user1.username,
      user1.displayName,
      [cred1, cred2],
    );
  });

  t.test("Sign out", async (t) => {
    await doSignOut(t, state);
  });

  t.test("Sign in with new passkey", async (t) => {
    await doSignIn(t, state, user1.username, cred2);
  });

  t.test("Delete original passkey", async (t) => {
    const response = await postForm(state, "/profile", {
      csrf_token: state.csrfToken,
      action: "delete_cred",
      cred_id: cred1.credentialID,
    });

    assertRedirectResponse(t, response, "/");

    // we should now have only the second cred registered to the existing user
    t.equal(state.users.length, 1);
    t.equal(state.credentials.length, 1);
    assertUserAndAssociatedCredentials(
      t,
      state,
      user1.username,
      user1.displayName,
      [cred2],
    );
  });
});
