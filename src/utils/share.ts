import { Response } from "express";
import { Duration } from "luxon";
import querystring from "querystring";

import { getFileProvider } from "../data";
import { fetchShareById } from "../services/share";
import { FileType, Share } from "../types/entity";
import { AuthenticatedRequest } from "../types/express";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  assertValue,
} from "./error";
import { logger } from "./logger";
import { now } from "./time";

const fileProvider = getFileProvider();
const { getFileInfo, sendFile } = fileProvider;

const EXPIRATIONS: string[] = [
  "PT5M",
  "PT30M",
  "PT1H",
  "PT12H",
  "P1D",
  "P3D",
  "P1W",
  "P2W",
  "P1M",
  "P3M",
  "P6M",
  "P1Y",
];

export function buildExpirations(current?: Duration) {
  return EXPIRATIONS.map((k) => ({
    value: k,
    description: Duration.fromISO(k).toHuman(),
    selected: k === current?.toISO(),
  }));
}

export function getFileTypeStyle(fileType: FileType) {
  switch (fileType) {
    case "document":
      return "primary";
    case "spreadsheet":
      return "success";
    case "presentation":
      return "warning";
    case "pdf":
      return "danger";
    case "image":
      return "info";
    case "video":
      return "secondary";
  }
}

export async function ensureShare(req: AuthenticatedRequest): Promise<Share> {
  // validate request
  const { share_id } = req.params;
  if (!share_id) {
    throw BadRequestError("Missing: share ID");
  }
  // find share
  const share = await fetchShareById(share_id);
  if (!share) {
    throw NotFoundError();
  }

  const { user } = req;

  // expired share
  if (
    !!share.expireDuration &&
    now() > share.created.plus(share.expireDuration)
  ) {
    logger.warn(share, "Share has expired");

    if (share.claimedBy && share.claimedBy.id === user?.id) {
      throw ForbiddenError("This share has expired");
    } else {
      throw NotFoundError();
    }
  }

  // authenticated user
  if (user) {
    // share has been claimed
    if (share.claimedBy) {
      // by a different user
      if (share.claimedBy.id !== user.id) {
        logger.warn(share, "Share was already claimed by a different user");

        if (share.createdBy.id === user.id) {
          throw ForbiddenError(
            `This share was already claimed by @${share.claimedBy.username}`
          );
        }

        throw NotFoundError();
      }
    }
    // unclaimed share
    else {
      // intended for a different user
      if (share.toUsername && share.toUsername !== user.username) {
        logger.warn(share, "Share was intended for a different user");

        if (share.createdBy.id === user.id) {
          throw ForbiddenError(
            `This share was intended for user @${share.toUsername}`
          );
        }

        throw NotFoundError();
      }
    }
  }

  // share can be accessed
  return share;
}

export async function renderSharedFile(
  req: AuthenticatedRequest,
  res: Response,
  share: Share,
  mediaType?: string
) {
  const file = await getFileInfo(share.backingUrl);
  if (!file) {
    throw ForbiddenError("File no longer exists");
  }

  if (!mediaType) {
    const downloadLinks = file.availableMediaTypes.map((t) => ({
      media_description: t.description,
      file_extension: t.extension,
      url: `/shares/${share.id}?${querystring.stringify({
        media_type: t.name,
      })}`,
    }));

    return res.render("shared_file", {
      title: "Ready to download your shared file?",
      fileTitle: file.title,
      fileType: file.type,
      fileTypeStyle: getFileTypeStyle(file.type),
      downloadLinks,
    });
  }

  const selectedMediaType = file.availableMediaTypes.find(
    (t) => t.name === mediaType
  );
  if (!selectedMediaType) {
    throw BadRequestError(`Unsupported media type for this file: ${mediaType}`);
  }

  await sendFile(file, selectedMediaType, res);
  logger.info(
    { share, file, mediaType },
    `Shared file downloaded by user '${assertValue(req.user).username}'`
  );
}
