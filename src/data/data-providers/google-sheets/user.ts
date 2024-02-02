import { ColumnConstraints, RowData } from "google-sheets-table";
import { DateTime } from "luxon";

import { User } from "../../../types/entity";

export const USER_SHEET_NAME = "users";
export const USER_CONSTRAINTS: ColumnConstraints = {
  uniques: ["id", "username"],
};

export function rowToUser(row: RowData): User {
  return {
    id: row.id,
    created: DateTime.fromISO(row.created, { zone: "utc" }),
    username: row.username,
    displayName: row.display_name,
    isAdmin: row.is_admin,
  };
}

export function userToRow(user: User): RowData {
  return {
    id: user.id,
    created: user.created.toISO(),
    username: user.username,
    display_name: user.displayName,
    is_admin: user.isAdmin,
  };
}
