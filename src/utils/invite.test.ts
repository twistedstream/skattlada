import { DateTime, Duration } from "luxon";
import sinon from "sinon";
import { test } from "tap";

// test objects

const logger = {
  warn: sinon.fake(),
};
const fetchInviteByIdStub = sinon.stub();
const nowStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./invite", {
    "../utils/logger": { logger },
    "../services/invite": { fetchInviteById: fetchInviteByIdStub },
    "./time": { now: nowStub },
    "./config": { maxInviteLifetime: Duration.fromObject({ days: 2 }) },
  });
}

// tests

test("utils/invite", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("ensureInvite", async (t) => {
    let ensureInvite: any;

    t.beforeEach(async () => {
      ensureInvite = importModule(t).ensureInvite;
    });

    t.test("if invite ID is missing, throws expected error", async (t) => {
      const req = { params: {} };

      t.rejects(() => ensureInvite(req), {
        message: "Missing: invite ID",
        statusCode: 400,
      });
    });

    t.test("looks up the invite", async (t) => {
      const req = { params: { invite_id: "invite-id" } };
      fetchInviteByIdStub.resolves({});

      try {
        await ensureInvite(req);
      } catch {}

      t.ok(fetchInviteByIdStub.called);
      t.equal(fetchInviteByIdStub.firstCall.firstArg, "invite-id");
    });

    t.test("if invite doesn't exist, throws expected error", async (t) => {
      const req = { params: { invite_id: "no-exist" } };
      fetchInviteByIdStub.resolves();

      t.rejects(() => ensureInvite(req), {
        message: "Not Found",
        statusCode: 404,
      });
    });

    t.test("with existing invite", async (t) => {
      let invite: any;
      let req: any;

      t.beforeEach(() => {
        invite = {
          id: "invite-id",
          created: DateTime.fromObject({ year: 2023, month: 1, day: 1 }),
        };
        req = {
          params: { invite_id: "invite-id" },
          user: { id: "user-id" },
        };
        fetchInviteByIdStub.resolves(invite);
      });

      t.test("if invite is already claimed", async (t) => {
        t.beforeEach(async () => {
          invite.claimed = DateTime.now();
          invite.claimedBy = { username: "foo" };
        });

        t.test("logs the expected warning", async (t) => {
          try {
            await ensureInvite(req);
          } catch {}

          t.ok(logger.warn.called);
          t.equal(logger.warn.firstCall.args[0], invite);
          t.equal(
            logger.warn.firstCall.args[1],
            "Invite was accessed after it was already claimed",
          );
        });

        t.test(
          "if invite was created by current user, throws expected informative error",
          async (t) => {
            invite.createdBy = { id: "user-id" };

            t.rejects(() => ensureInvite(req), {
              message: "This invite was already claimed by @foo",
              statusCode: 403,
            });
          },
        );

        t.test(
          "if invite was created by another user, throws expected more generic error",
          async (t) => {
            invite.createdBy = { id: "other-user-id" };

            t.rejects(() => ensureInvite(req), {
              message: "Not Found",
              statusCode: 404,
            });
          },
        );

        t.test(
          "if no current user, throws expected more generic error",
          async (t) => {
            invite.createdBy = { id: "other-user-id" };
            delete req.user;

            t.rejects(() => ensureInvite(req), {
              message: "Not Found",
              statusCode: 404,
            });
          },
        );
      });

      t.test("if invite has already expired", async (t) => {
        t.beforeEach(async () => {
          nowStub.returns(
            invite.created.plus(
              // now = after invite expiration
              Duration.fromObject({ days: 3 }),
            ),
          );
        });

        t.test("logs the expected warning", async (t) => {
          try {
            await ensureInvite(req);
          } catch {}

          t.ok(logger.warn.called);
          t.equal(logger.warn.firstCall.args[0], invite);
          t.equal(logger.warn.firstCall.args[1], "Invite has expired");
        });

        t.test(
          "if invite was created by current user, throws expected informative error",
          async (t) => {
            invite.createdBy = { id: "user-id" };

            t.rejects(() => ensureInvite(req), {
              message: "This invite has expired",
              statusCode: 403,
            });
          },
        );

        t.test(
          "if invite was created by another user, throws expected more generic error",
          async (t) => {
            invite.createdBy = { id: "other-user-id" };

            t.rejects(() => ensureInvite(req), {
              message: "Not Found",
              statusCode: 404,
            });
          },
        );

        t.test(
          "if no current user, throws expected more generic error",
          async (t) => {
            invite.createdBy = { id: "other-user-id" };
            delete req.user;

            t.rejects(() => ensureInvite(req), {
              message: "Not Found",
              statusCode: 404,
            });
          },
        );
      });

      t.test("otherwise, returns expected invite", async (t) => {
        nowStub.returns(
          invite.created.plus(
            // now = before invite expiration
            Duration.fromObject({ days: 1 }),
          ),
        );

        const result = await ensureInvite(req);

        t.ok(result);
        t.equal(result, invite);
      });
    });
  });
});
