import { fetchInviteById } from "../services/invite";
import { Invite } from "../types/entity";
import { AuthenticatedRequest } from "../types/express";
import { maxInviteLifetime } from "./config";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  assertValue,
} from "./error";
import { logger } from "./logger";
import { now } from "./time";

export async function ensureInvite(req: AuthenticatedRequest): Promise<Invite> {
  // validate request
  const { invite_id } = req.params;
  if (!invite_id) {
    throw BadRequestError("Missing: invite ID");
  }

  // find invite
  const invite = await fetchInviteById(invite_id);
  if (!invite) {
    throw NotFoundError();
  }

  const { user } = req;

  // make sure it hasn't already been claimed
  if (invite.claimed) {
    logger.warn(invite, "Invite was accessed after it was already claimed");

    if (invite.createdBy.id === user?.id) {
      const claimedBy = assertValue(invite.claimedBy);

      throw ForbiddenError(
        `This invite was already claimed by @${claimedBy.username}`
      );
    }

    throw NotFoundError();
  }

  // make sure it hasn't expired
  if (now() > invite.created.plus(maxInviteLifetime)) {
    logger.warn(invite, "Invite has expired");

    if (invite.createdBy.id === user?.id) {
      throw ForbiddenError(`This invite has expired`);
    }

    throw NotFoundError();
  }

  return invite;
}
