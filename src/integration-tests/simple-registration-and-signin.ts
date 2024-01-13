import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { LocalFileProvider } from "../data/file-providers/local";
import { Invite } from "../types/entity";
import { assertValue } from "../utils/error";
import { testCredential1 } from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertNoUsersOrCredentials,
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

test("Navigate, generate invite from root user, register a new user, sign out, sign in", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  const fileProvider = new LocalFileProvider();
  await fileProvider.initialize();

  const username = "bob";
  const displayName = "Bob User";
  const cred1 = testCredential1();

  let rootInvite: Invite;

  // start with no registered users
  const state = await createIntegrationTestState(t, fileProvider, {
    users: [],
    credentials: [],
    invites: [],
    shares: [],
  });

  t.test("Initial data state", async (t) => {
    // we should have no users or creds
    assertNoUsersOrCredentials(t, state);

    t.equal(state.invites.length, 0);
  });

  t.test("Create root user and invite", async (t) => {
    rootInvite = assertValue(await state.initializeServices());

    // we should have the root admin user (with no credential)
    t.equal(state.users.length, 1);
    t.equal(state.users[0].username, "root");
    t.ok(state.users[0].isAdmin);
    t.equal(state.credentials.length, 0);
    t.equal(state.invites.length, 1);
  });

  t.test("Go to home page, which redirects to shares page", async (t) => {
    const response = await navigatePage(state, "/");
    assertRedirectResponse(t, response, "/shares");
  });

  t.test("Go to login page", async (t) => {
    const response = await navigatePage(state, "/login");
    assertHtmlResponse(t, response);
  });

  t.test("Go to profile page, but be challenged to authenticate", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertRedirectResponse(t, response, "/login?return_to=%2Fprofile");
  });

  t.test("Go to invite page from root user", async (t) => {
    const response = await navigatePage(state, `/invites/${rootInvite.id}`);
    assertHtmlResponse(t, response);
  });

  t.test("Accept root invite", async (t) => {
    const response = await postForm(state, `/invites/${rootInvite.id}`, {
      csrf_token: state.csrfToken,
      action: "accept",
    });

    assertRedirectResponse(
      t,
      response,
      `/register?return_to=%2Finvites%2F${rootInvite.id}&hide_sign_in=true`
    );
  });

  t.test("Go to registration page", async (t) => {
    const response = await navigatePage(state, state.redirectUrl);
    assertHtmlResponse(t, response);
  });

  t.test("Register a new account", async (t) => {
    await doRegistration(t, state, username, displayName, cred1, true);

    // we should have a new user with a new cred
    t.equal(state.users.length, 2);
    t.equal(state.credentials.length, 1);
    assertUserAndAssociatedCredentials(t, state, username, displayName, [
      cred1,
    ]);
  });

  t.test("Sign out", async (t) => {
    await doSignOut(t, state);
  });

  t.test("Sign in", async (t) => {
    await doSignIn(t, state, username, cred1);
  });

  t.test("Go to profile page, and access content", async (t) => {
    const response = await navigatePage(state, "/profile");
    assertHtmlResponse(t, response);
  });
});
