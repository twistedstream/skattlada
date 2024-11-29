import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import { Response as SupertestResponse } from "supertest";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { LocalFileProvider } from "../data/file-providers/local";
import { testCredential1, testUser1 } from "../utils/testing/data";
import {
  createIntegrationTestState,
  doSignIn,
  postForm,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

function assertCsrfErrorResponse(test: Tap.Test, response: SupertestResponse) {
  test.equal(
    response.status,
    StatusCodes.FORBIDDEN,
    "expected forbidden http status",
  );
  test.match(
    response.headers["content-type"],
    "text/html",
    "expected html content",
  );
  test.match(response.text, "csrf", "expected CSRF error content");
}

// These tests are designed to ensure endpoints that should be protected
// from CSRF attacks are doing so. The test starts with an existing user
// session and then each endpoint is tested.

test("Ensure CSRF protection", async (t) => {
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

  t.test("Fail to update user's profile without a CSRF token", async (t) => {
    const response = await postForm(state, "/profile", {
      // no csrf_token
      action: "update_profile",
      display_name: "Bob User 2",
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to update user's profile without a CSRF token", async (t) => {
    const response = await postForm(state, "/profile", {
      // no csrf_token
      action: "update_profile",
      display_name: "Bob User 2",
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to delete a passkey without a CSRF token", async (t) => {
    const response = await postForm(state, "/profile", {
      // no csrf_token
      action: "delete_cred",
      cred_id: cred1.credentialID,
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to validate a new share without a CSRF token", async (t) => {
    const response = await postForm(state, `/shares/new`, {
      // no csrf_token
      action: "validate",
      backingUrl: "https://example.com/foo",
      toUsername: user1.username,
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to create a new share without a CSRF token", async (t) => {
    const response = await postForm(state, `/shares/new`, {
      // no csrf_token
      action: "create",
      backingUrl: "https://example.com/foo",
      toUsername: user1.username,
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to accept a share without a CSRF token", async (t) => {
    const response = await postForm(state, `/shares/SHARE1`, {
      // no csrf_token
      action: "accept",
    });

    assertCsrfErrorResponse(t, response);
  });

  t.test("Fail to accept an invite without a CSRF token", async (t) => {
    const response = await postForm(state, `/invites/INVITE1`, {
      // no csrf_token
      action: "accept",
    });

    assertCsrfErrorResponse(t, response);
  });
});
