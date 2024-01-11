import { urlencoded } from "body-parser";
import { Response, Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Duration } from "luxon";

import {
  claimShare,
  createShare,
  fetchSharesByClaimedUserId,
  fetchSharesByCreatedUserId,
  newShare,
} from "../services/share";
import { Share } from "../types/entity";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
  AuthenticatedRequestWithTypedQuery,
} from "../types/express";
import {
  authorizeRegistration,
  clearRegisterable,
  getRegisterable,
  redirectToRegister,
  requiresAdmin,
  requiresAuth,
} from "../utils/auth";
import { baseUrl } from "../utils/config";
import { generateCsrfToken, validateCsrfToken } from "../utils/csrf";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  assertValue,
} from "../utils/error";
import { logger } from "../utils/logger";
import {
  buildExpirations,
  ensureShare,
  getFileTypeStyle,
  renderSharedFile,
} from "../utils/share";

const router = Router();

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);

    const sharesWithMe = (await fetchSharesByClaimedUserId(user.id)).map(
      (s) => ({
        title: s.fileTitle,
        url: `${baseUrl}/shares/${s.id}`,
        created: s.created.toISO(),
        from: s.createdBy.username,
        claimed: assertValue(s.claimed).toISO(),
      })
    );
    const sharesByMe = (await fetchSharesByCreatedUserId(user.id)).map((s) => ({
      title: s.fileTitle,
      url: `${baseUrl}/shares/${s.id}`,
      created: s.created.toISO(),
      to: s.toUsername,
      expires: s.expireDuration?.toHuman(),
      claimed: s.claimed?.toISO(),
      claimed_by: s.claimedBy?.username,
      backing_url: s.backingUrl,
    }));

    res.render("shares", {
      title: "Shares",
      sharesWithMe,
      sharesByMe,
    });
  }
);

router.get(
  "/new",
  requiresAuth(),
  requiresAdmin(),
  async (req: AuthenticatedRequest, res: Response) => {
    const csrf_token = generateCsrfToken(req, res, true);
    res.render("new_share", {
      csrf_token,
      title: "New share",
      expirations: buildExpirations(),
    });
  }
);

router.post(
  "/new",
  urlencoded({ extended: false }),
  validateCsrfToken(),
  requiresAuth(),
  requiresAdmin(),
  async (
    req: AuthenticatedRequestWithTypedBody<{
      action: "validate" | "create";
      backingUrl: string;
      toUsername?: string;
      expires?: string;
    }>,
    res: Response
  ) => {
    const user = assertValue(req.user);
    const { action, backingUrl, toUsername, expires } = req.body;

    if (action === "validate" || action === "create") {
      const expireDuration: Duration | undefined = expires
        ? Duration.fromISO(expires)
        : undefined;

      let share: Share;
      try {
        share = await newShare(user, backingUrl, toUsername, expireDuration);
      } catch (err: any) {
        if (err.type === "validation") {
          const csrf_token = generateCsrfToken(req, res, false);
          return res.status(StatusCodes.BAD_REQUEST).render("new_share", {
            csrf_token,
            title: "New share",
            expirations: buildExpirations(expireDuration),
            [`${err.field}_error`]: err.fieldMessage,
            backingUrl,
            backingUrl_valid: err.field !== "backingUrl",
            toUsername,
            expires,
          });
        }

        throw err;
      }

      if (action === "validate") {
        const csrf_token = generateCsrfToken(req, res, false);
        return res.render("new_share", {
          csrf_token,
          title: "New share",
          expirations: buildExpirations(share.expireDuration),
          backingUrl: share.backingUrl,
          backingUrl_valid: true,
          toUsername: share.toUsername,
          expires: share.expireDuration?.toISO(),
          fileTitle: share.fileTitle,
          fileType: share.fileType,
          fileTypeStyle: getFileTypeStyle(share.fileType),
          can_create: true,
        });
      }

      // create
      await createShare(share);

      return res.redirect("/shares");
    }

    throw BadRequestError("Unsupported new share action");
  }
);

router.get(
  "/:share_id",
  async (
    req: AuthenticatedRequestWithTypedQuery<{ media_type?: string }>,
    res: Response
  ) => {
    const share = await ensureShare(req);
    const { user } = req;
    const { media_type } = req.query;

    if (user) {
      if (share.claimed) {
        // render share
        return renderSharedFile(req, res, share, media_type);
      }

      if (getRegisterable(req)) {
        // claim share by newly registered user
        clearRegisterable(req);
        const claimedShare = await claimShare(share.id, user);
        logger.info(claimedShare, "New user has claimed share");

        // render share
        return renderSharedFile(req, res, claimedShare, media_type);
      }
    } else {
      // check to see if we need to allow user to sign in
      if (
        // so user has chance to auth and access share
        share.claimed ||
        // (to come back) if share was intended for a specific user
        share.toUsername
      ) {
        throw UnauthorizedError();
      }
    }

    // display accept form
    const csrf_token = generateCsrfToken(req, res, true);
    return res.render("accept_share", {
      csrf_token,
      title: "Accept this shared file?",
      share,
      fileTypeStyle: getFileTypeStyle(share.fileType),
    });
  }
);

router.post(
  "/:share_id",
  urlencoded({ extended: false }),
  validateCsrfToken(),
  async (
    req: AuthenticatedRequest<{ action: "accept" | "reject" }>,
    res: Response
  ) => {
    const share = await ensureShare(req);
    const { action } = req.body;

    if (share.claimed) {
      throw ForbiddenError(
        "This endpoint does not support an already claimed share"
      );
    }

    if (action === "accept") {
      const { user } = req;

      if (user) {
        // claim share by existing user
        clearRegisterable(req);
        const claimedShare = await claimShare(share.id, user);
        logger.info(claimedShare, `Existing user has claimed share`);

        // redirect to GET endpoint to render share
        return res.redirect(req.originalUrl);
      }

      // authorize registration with share and redirect to register page (to come back)
      authorizeRegistration(req, share);
      return redirectToRegister(req, res, false);
    }

    throw BadRequestError("Unsupported share response operation");
  }
);

export default router;
