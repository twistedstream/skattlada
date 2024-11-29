import { StatusCodes } from "http-status-codes";
import { Duration } from "luxon";
import sinon from "sinon";
import { test } from "tap";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import { LocalFileProvider } from "../data/file-providers/local";
import { assertValue } from "../utils/error";
import {
  testCredential1,
  testShare1,
  testUser1,
  testUser2,
} from "../utils/testing/data";
import {
  assertHtmlResponse,
  assertRedirectResponse,
  createIntegrationTestState,
  doSignIn,
  navigatePage,
} from "../utils/testing/integration";

// NOTE: Tap should be run with --bail to stop on first failed assertion

test("Recipient loses access to claimed share when it expires", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  // files
  const fileProvider = new LocalFileProvider();
  await fileProvider.initialize();
  const files = assertValue(fileProvider.files).all;
  const file1 = files[0];

  // regular user
  const user1 = testUser1();
  const cred1 = testCredential1();
  // admin user
  const user2 = testUser2();
  // shares
  const share1 = testShare1(user2, {
    file: file1,
    claimedBy: user1,
  });

  // start with a claimed shared file
  const state = await createIntegrationTestState(t, fileProvider, {
    users: [user1, user2],
    credentials: [{ ...cred1, user: user1 }],
    invites: [],
    shares: [share1],
  });

  t.test("Initial data state", async (t) => {
    // we should have an existing user and cred
    t.equal(state.users.length, 2);
    t.equal(state.credentials.length, 1);
    t.equal(state.shares.length, 1);
  });

  t.test("Go to share link (which redirects to login)", async (t) => {
    const share = state.shares[0];

    const response = await navigatePage(state, `/shares/${share.id}`);
    assertRedirectResponse(
      t,
      response,
      `/login?return_to=%2Fshares%2F${share.id}`,
    );
  });

  t.test("Follow redirect to login page", async (t) => {
    const response = await navigatePage(state, state.redirectUrl);
    assertHtmlResponse(t, response);
  });

  t.test("Sign in as regular user", async (t) => {
    await doSignIn(t, state, user1.username, cred1);
  });

  t.test(
    "Follow redirect back to the share link and validate content",
    async (t) => {
      const share = state.shares[0];

      const response = await navigatePage(state, state.redirectUrl);

      t.same(share.claimedBy, user1);

      assertHtmlResponse(t, response);
    },
  );

  t.test(
    "Force share to expire, attempt to access again, and get forbidden",
    async (t) => {
      const share = state.shares[0];
      share.expireDuration = Duration.fromObject({ seconds: 1 });

      const response = await navigatePage(state, `/shares/${share.id}`);

      t.equal(
        response.status,
        StatusCodes.FORBIDDEN,
        "expected forbidden http status",
      );
    },
  );
});
