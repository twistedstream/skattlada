import { urlencoded } from "body-parser";
import { Response, Router } from "express";

import { claimInvite } from "../services/invite";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import {
  authorizeRegistration,
  clearRegisterable,
  getRegisterable,
  redirectToRegister,
} from "../utils/auth";
import { generateCsrfToken, validateCsrfToken } from "../utils/csrf";
import { BadRequestError, ForbiddenError } from "../utils/error";
import { ensureInvite } from "../utils/invite";
import { logger } from "../utils/logger";

const router = Router();

// endpoints

router.get("/:invite_id", async (req: AuthenticatedRequest, res: Response) => {
  const invite = await ensureInvite(req);

  const { user } = req;
  // if current user (just registered)
  if (user) {
    const registerable = getRegisterable(req);
    if (!registerable) {
      throw ForbiddenError(
        "You can't accept an invite to register when you're already signed in"
      );
    }

    // claim invite
    clearRegisterable(req);
    const claimedInvite = await claimInvite(invite.id, user);
    logger.info(claimedInvite, "New user has claimed invite");

    // redirect to shares page
    return res.redirect("/shares");
  }

  // no user yet: display accept form
  const csrf_token = generateCsrfToken(req, res, true);
  res.render("accept_invite", {
    csrf_token,
    title: "You've been invited",
    invite,
  });
});

router.post(
  "/:invite_id",
  urlencoded({ extended: false }),
  validateCsrfToken(),
  async (
    req: AuthenticatedRequestWithTypedBody<{ action: "accept" | "reject" }>,
    res: Response
  ) => {
    const invite = await ensureInvite(req);
    if (req.user) {
      throw ForbiddenError(
        "This endpoint does not support an existing user session"
      );
    }

    const { action } = req.body;

    if (action === "accept") {
      // authorize registration with invite and redirect to register page (to come back)
      authorizeRegistration(req, invite);
      return redirectToRegister(req, res, true);
    }

    throw BadRequestError("Unsupported invite response operation");
  }
);

export default router;
