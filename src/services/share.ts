import { Duration } from "luxon";

import { getDataProvider, getFileProvider } from "../data";
import { Share, User } from "../types/entity";
import { ValidationError } from "../types/error";
import { assertValue } from "../utils/error";
import { unique } from "../utils/identifier";
import { now } from "../utils/time";

const dataProvider = getDataProvider();
const {
  findSharesByClaimedUserId,
  findSharesByCreatedUserId,
  findShareById,
  findUserByName,
  insertShare,
  updateShare,
} = dataProvider;

const fileProvider = getFileProvider();
const { getFileInfo } = fileProvider;

// service

export async function fetchSharesByClaimedUserId(
  userID: string,
): Promise<Share[]> {
  return findSharesByClaimedUserId(userID);
}

export async function fetchSharesByCreatedUserId(
  userID: string,
): Promise<Share[]> {
  return findSharesByCreatedUserId(userID);
}

export async function fetchShareById(
  shareId: string,
): Promise<Share | undefined> {
  return findShareById(shareId);
}

export async function newShare(
  by: User,
  backingUrl: string,
  toUsername?: string,
  toGroup?: string,
  expireDuration?: Duration,
): Promise<Share> {
  // get file info and make sure it exists
  const fileInfo = await getFileInfo(backingUrl);
  if (!fileInfo) {
    throw new ValidationError(
      "Share",
      "backingUrl",
      "File not found or invalid URL",
    );
  }

  // enforce to-user and to-group being mutually exclusive
  if (toUsername && toGroup) {
    throw new ValidationError(
      "Share",
      "toUsername",
      "Share cannot be to both a user and a group",
    );
  }

  // make sure to-user exists
  if (toUsername) {
    if (!(await findUserByName(toUsername))) {
      throw new ValidationError("Share", "toUsername", "User does not exist");
    }
  }

  // make sure to-group exists
  if (toGroup) {
    if (toGroup !== "everyone") {
      throw new ValidationError("Share", "toGroup", "Group does not exist");
    }
  }

  const share: Share = {
    id: unique(),
    isAdmin: false,
    created: now(),
    createdBy: by,
    sourceType: "share",
    backingUrl,
    toUsername,
    toGroup,
    expireDuration,
    fileTitle: fileInfo.title,
    fileType: fileInfo.type,
    availableMediaTypes: fileInfo.availableMediaTypes,
  };

  return share;
}

export async function createShare(share: Share): Promise<Share> {
  return insertShare(share);
}

export async function claimShare(shareId: string, by: User): Promise<Share> {
  const existingShare = await findShareById(shareId);
  if (!existingShare) {
    throw new Error(`Share with ID '${shareId}' does not exist`);
  }
  if (existingShare.claimed) {
    throw new Error(`Share with ID '${shareId}' has already been claimed`);
  }

  existingShare.claimed = now();
  existingShare.claimedBy = by;
  await updateShare(existingShare);

  return assertValue(await findShareById(existingShare.id));
}
