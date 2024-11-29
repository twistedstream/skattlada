import { resolveMime } from "friendly-mimes";
import { ColumnConstraints, RowData } from "google-sheets-table";
import { DateTime, Duration } from "luxon";

import { Share } from "../../../types/entity";
import { rowToUser, userToRow } from "./user";

export const SHARE_SHEET_NAME = "shares";
export const SHARE_CONSTRAINTS: ColumnConstraints = { uniques: ["id"] };

export function rowToShare(
  shareRow: RowData,
  createdByRow: RowData,
  claimedByRow?: RowData,
): Share {
  return {
    id: shareRow.id,
    sourceType: "share",
    isAdmin: shareRow.is_admin,
    created: DateTime.fromISO(shareRow.created, { zone: "utc" }),
    createdBy: rowToUser(createdByRow),
    claimedBy: claimedByRow && rowToUser(claimedByRow),
    claimed:
      shareRow.claimed && shareRow.claimed.length > 0
        ? DateTime.fromISO(shareRow.claimed, { zone: "utc" })
        : undefined,
    backingUrl: shareRow.backing_url,
    fileTitle: shareRow.file_title,
    fileType: shareRow.file_type,
    availableMediaTypes: (<string>shareRow.available_media_types)
      .split(",")
      .map((m) => resolveMime(m))
      .map((m) => ({
        name: m.mime,
        description: m.name,
        extension: m.fileType.substring(1),
      })),
    toUsername: shareRow.to_username,
    expireDuration:
      shareRow.expire_duration && Duration.fromISO(shareRow.expire_duration),
  };
}

export function shareToRow(share: Share): {
  shareRow: RowData;
  createdByRow: RowData;
  claimedByRow?: RowData;
} {
  return {
    shareRow: {
      id: share.id,
      is_admin: share.isAdmin,
      created: share.created.toISO(),
      created_by: share.createdBy.id,
      claimed_by: share.claimedBy?.id,
      claimed: share.claimed?.toISO(),
      backing_url: share.backingUrl,
      file_title: share.fileTitle,
      file_type: share.fileType,
      available_media_types: share.availableMediaTypes
        .map((m) => m.name)
        .join(","),
      to_username: share.toUsername,
      expire_duration: share.expireDuration?.toISO(),
    },
    createdByRow: userToRow(share.createdBy),
    claimedByRow: share.claimedBy && userToRow(share.claimedBy),
  };
}
