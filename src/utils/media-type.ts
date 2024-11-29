import { resolveMime } from "friendly-mimes";

import { FileType, MediaType } from "../types/entity";
import { logger } from "./logger";

export function fileTypeFromMediaType(
  mediaType: MediaType,
): FileType | undefined {
  switch (mediaType.name) {
    case "application/vnd.google-apps.document":
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.oasis.opendocument.text":
    case "application/x-vnd.oasis.opendocument.text":
    case "application/rtf":
    case "text/plain":
      return "document";

    case "application/vnd.google-apps.spreadsheet":
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/x-vnd.oasis.opendocument.spreadsheet":
    case "text/csv":
    case "text/tab-separated-values":
      return "spreadsheet";

    case "application/vnd.google-apps.presentation":
    case "application/vnd.ms-powerpoint":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.oasis.opendocument.presentation":
    case "application/x-vnd.oasis.opendocument.presentation":
      return "presentation";

    case "application/pdf":
      return "pdf";

    case "application/vnd.google-apps.drawing":
    case "image/jpeg":
    case "image/png":
    case "image/svg+xml":
      return "image";

    case "video/mp4":
    case "video/quicktime":
    case "video/avi":
      return "video";
  }
}

type Mime = { mime: string; name: string; fileType: string };

export function mediaTypeFromMimeType(mimeType: string): MediaType | undefined {
  let mime: Mime | undefined;

  try {
    mime = resolveMime(mimeType);
  } catch (err) {
    logger.warn(err, "Unable to resolve mime data from mime type");
  }
  if (mime) {
    return {
      name: mime.mime,
      description: mime.name,
      extension: mime.fileType.split(".")[1],
    };
  }
}
