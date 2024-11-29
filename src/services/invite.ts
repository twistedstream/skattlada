import { getDataProvider } from "../data";
import { Invite, User } from "../types/entity";
import { assertValue } from "../utils/error";
import { unique } from "../utils/identifier";
import { now } from "../utils/time";

const provider = getDataProvider();
const { findInviteById, updateInvite } = provider;

// service

export async function newInvite(by: User, isAdmin: boolean): Promise<Invite> {
  const invite: Invite = {
    id: unique(),
    sourceType: "invite",
    isAdmin,
    created: now(),
    createdBy: by,
  };

  return invite;
}

export async function fetchInviteById(
  inviteId: string,
): Promise<Invite | undefined> {
  return findInviteById(inviteId);
}

export async function claimInvite(inviteId: string, by: User): Promise<Invite> {
  const existingInvite = await findInviteById(inviteId);
  if (!existingInvite) {
    throw new Error(`Invite with ID '${inviteId}' does not exist`);
  }
  if (existingInvite.claimed) {
    throw new Error(`Invite with ID '${inviteId}' has already been claimed`);
  }

  existingInvite.claimed = now();
  existingInvite.claimedBy = by;
  await updateInvite(existingInvite);

  return assertValue(await findInviteById(existingInvite.id));
}
