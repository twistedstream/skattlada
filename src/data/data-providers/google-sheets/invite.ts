import { ColumnConstraints, RowData } from "google-sheets-table";
import { DateTime } from "luxon";

import { Invite } from "../../../types/entity";
import { rowToUser, userToRow } from "./user";

// invite
export const INVITE_SHEET_NAME = "invites";
export const INVITE_CONSTRAINTS: ColumnConstraints = { uniques: ["id"] };

export function rowToInvite(
  inviteRow: RowData,
  createdByRow: RowData,
  claimedByRow?: RowData
): Invite {
  return {
    id: inviteRow.id,
    sourceType: "invite",
    isAdmin: inviteRow.is_admin,
    created: DateTime.fromISO(inviteRow.created, { zone: "utc" }),
    createdBy: rowToUser(createdByRow),
    claimedBy: claimedByRow && rowToUser(claimedByRow),
    claimed:
      inviteRow.claimed && inviteRow.claimed.length > 0
        ? DateTime.fromISO(inviteRow.claimed, { zone: "utc" })
        : undefined,
  };
}

export function inviteToRow(invite: Invite): {
  inviteRow: RowData;
  createdByRow: RowData;
  claimedByRow?: RowData;
} {
  return {
    inviteRow: {
      id: invite.id,
      is_admin: invite.isAdmin,
      created: invite.created.toISO(),
      created_by: invite.createdBy.id,
      claimed_by: invite.claimedBy?.id,
      claimed: invite.claimed?.toISO(),
    },
    createdByRow: userToRow(invite.createdBy),
    claimedByRow: invite.claimedBy && userToRow(invite.claimedBy),
  };
}
