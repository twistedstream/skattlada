import { JWTInput } from "google-auth-library";
import { GoogleSheetsTable } from "google-sheets-table";

import { IDataProvider } from "../../../types/data";
import {
  Authenticator,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "../../../types/entity";
import {
  googleAuthClientEmail as client_email,
  googleAuthPrivateKey as private_key,
  googleSpreadsheetId as spreadsheetId,
} from "../../../utils/config";
import { assertValue } from "../../../utils/error";
import { logger } from "../../../utils/logger";
import {
  CREDENTIAL_CONSTRAINTS,
  CREDENTIAL_SHEET_NAME,
  credentialToRow,
  rowToCredential,
} from "./credential";
import {
  INVITE_CONSTRAINTS,
  INVITE_SHEET_NAME,
  inviteToRow,
  rowToInvite,
} from "./invite";
import {
  SHARE_CONSTRAINTS,
  SHARE_SHEET_NAME,
  rowToShare,
  shareToRow,
} from "./share";
import {
  USER_CONSTRAINTS,
  USER_SHEET_NAME,
  rowToUser,
  userToRow,
} from "./user";

// common Google API credentials
const credentials: JWTInput = { client_email, private_key };

export class GoogleSheetsDataProvider implements IDataProvider {
  private _initialized: boolean = false;

  constructor() {
    // bind method "this"'s to instance "this"
    this.initialize = this.initialize.bind(this);
    this.getUserCount = this.getUserCount.bind(this);
    this.findUserById = this.findUserById.bind(this);
    this.findUserByName = this.findUserByName.bind(this);
    this.insertUser = this.insertUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.findCredentialById = this.findCredentialById.bind(this);
    this.findUserCredential = this.findUserCredential.bind(this);
    this.findCredentialsByUser = this.findCredentialsByUser.bind(this);
    this.insertCredential = this.insertCredential.bind(this);
    this.deleteCredential = this.deleteCredential.bind(this);
    this.findInviteById = this.findInviteById.bind(this);
    this.insertInvite = this.insertInvite.bind(this);
    this.updateInvite = this.updateInvite.bind(this);
    this.findShareById = this.findShareById.bind(this);
    this.findSharesByClaimedUserId = this.findSharesByClaimedUserId.bind(this);
    this.findSharesByCreatedUserId = this.findSharesByCreatedUserId.bind(this);
    this.insertShare = this.insertShare.bind(this);
    this.updateShare = this.updateShare.bind(this);
  }

  // IDataProvider implementation

  async initialize(): Promise<void> {
    if (!this._initialized) {
      logger.info("Google Sheets data provider initialized");
      this._initialized = true;
    }
  }

  // users

  private _usersTable = new GoogleSheetsTable({
    credentials,
    spreadsheetId,
    sheetName: USER_SHEET_NAME,
    columnConstraints: USER_CONSTRAINTS,
  });

  async getUserCount(): Promise<number> {
    return this._usersTable.countRows();
  }

  async findUserById(userID: string): Promise<User | undefined> {
    const { row } = await this._usersTable.findRow((r) => r.id === userID);
    if (row) {
      return rowToUser(row);
    }
  }

  async findUserByName(username: string): Promise<User | undefined> {
    const { row } = await this._usersTable.findRow(
      (r) => r.username === username
    );
    if (row) {
      return rowToUser(row);
    }
  }

  async insertUser(user: User): Promise<User> {
    const newRow = userToRow(user);
    const { insertedRow } = await this._usersTable.insertRow(newRow);
    return rowToUser(insertedRow);
  }

  async updateUser(user: User): Promise<void> {
    await this._usersTable.updateRow((r) => r.id === user.id, {
      display_name: user.displayName,
    });
  }

  // credentials

  private _credentialsTable = new GoogleSheetsTable({
    credentials,
    spreadsheetId,
    sheetName: CREDENTIAL_SHEET_NAME,
    columnConstraints: CREDENTIAL_CONSTRAINTS,
  });

  async findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const { row: credentialRow } = await this._credentialsTable.findRow(
      (r) => r.id === credentialID
    );
    if (credentialRow) {
      const { row: userRow } = await this._usersTable.findRow(
        (r) => r.id === credentialRow.user_id
      );
      if (!userRow) {
        throw new Error(
          `Data integrity error: user '${credentialRow.user_id}' no longer exists for credential '${credentialRow.id}'`
        );
      }

      return rowToCredential(credentialRow, userRow);
    }
  }

  async findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const [{ row: userRow }, { row: credentialRow }] = await Promise.all([
      this._usersTable.findRow((r) => r.id === userID),
      this._credentialsTable.findRow(
        (r) => r.user_id === userID && r.id === credentialID
      ),
    ]);
    if (userRow && credentialRow) {
      return rowToCredential(credentialRow, userRow);
    }
  }

  async findCredentialsByUser(
    userID: string
  ): Promise<RegisteredAuthenticator[]> {
    const [{ row: userRow }, { rows: credentialRows }] = await Promise.all([
      this._usersTable.findRow((r) => r.id === userID),
      this._credentialsTable.findRows((r) => r.user_id === userID),
    ]);

    if (userRow && credentialRows.length > 0) {
      return credentialRows.map((credentialRow) =>
        rowToCredential(credentialRow, userRow)
      );
    }
    return [];
  }

  async insertCredential(
    userID: string,
    credential: Authenticator
  ): Promise<void> {
    const { row: userRow } = await this._usersTable.findRow(
      (r) => r.id === userID
    );
    assertValue(userRow, "User does not exist");

    const credentialRow = credentialToRow(credential, userID);

    await this._credentialsTable.insertRow(credentialRow);
  }

  async deleteCredential(credentialID: string): Promise<void> {
    return this._credentialsTable.deleteRow((r) => r.id === credentialID);
  }

  // invites

  private _invitesTable = new GoogleSheetsTable({
    credentials,
    spreadsheetId,
    sheetName: INVITE_SHEET_NAME,
    columnConstraints: INVITE_CONSTRAINTS,
  });

  async findInviteById(inviteId: string): Promise<Invite | undefined> {
    const { row: inviteRow } = await this._invitesTable.findRow(
      (r) => r.id === inviteId
    );
    if (inviteRow) {
      const relatedUserIds = [
        inviteRow.created_by,
        ...(inviteRow.claimed_by ? [inviteRow.claimed_by] : []),
      ];
      const { rowsByKey: userRowsById } = await this._usersTable.findKeyRows(
        (r) => r.id,
        relatedUserIds
      );

      return rowToInvite(
        inviteRow,
        userRowsById[inviteRow.created_by],
        userRowsById[inviteRow.claimed_by]
      );
    }
  }

  async insertInvite(invite: Invite): Promise<Invite> {
    const {
      inviteRow: newRow,
      createdByRow,
      claimedByRow,
    } = inviteToRow(invite);
    const { insertedRow } = await this._invitesTable.insertRow(newRow);

    return rowToInvite(insertedRow, createdByRow, claimedByRow);
  }

  async updateInvite(invite: Invite): Promise<void> {
    await this._invitesTable.updateRow((r) => r.id === invite.id, {
      claimed_by: invite.claimedBy?.id,
      claimed: invite.claimed?.toISO(),
    });
  }

  // shares

  private _sharesTable = new GoogleSheetsTable({
    credentials,
    spreadsheetId,
    sheetName: SHARE_SHEET_NAME,
    columnConstraints: SHARE_CONSTRAINTS,
  });

  async findShareById(shareId: string): Promise<Share | undefined> {
    const { row: shareRow } = await this._sharesTable.findRow(
      (r) => r.id === shareId
    );
    if (shareRow) {
      const relatedUserIds = [
        shareRow.created_by,
        ...(shareRow.claimed_by ? [shareRow.claimed_by] : []),
      ];
      const { rowsByKey: userRowsById } = await this._usersTable.findKeyRows(
        (r) => r.id,
        relatedUserIds
      );

      return rowToShare(
        shareRow,
        userRowsById[shareRow.created_by],
        userRowsById[shareRow.claimed_by]
      );
    }
  }

  async findSharesByClaimedUserId(userID: string): Promise<Share[]> {
    const { rows: shareRows } = await this._sharesTable.findRows(
      (r) => r.claimed_by === userID
    );

    const relatedUserIds = shareRows.reduce(
      (p, c) => [...p, c.created_by, c.claimed_by],
      <string[]>[]
    );
    const { rowsByKey: userRowsById } = await this._usersTable.findKeyRows(
      (r) => r.id,
      relatedUserIds
    );

    return shareRows.map((r) =>
      rowToShare(r, userRowsById[r.created_by], userRowsById[r.claimed_by])
    );
  }

  async findSharesByCreatedUserId(userID: string): Promise<Share[]> {
    const { rows: shareRows } = await this._sharesTable.findRows(
      (r) => r.created_by === userID
    );

    const relatedUserIds = shareRows.reduce(
      (p, c) => [...p, c.created_by, ...(c.claimed_by ? [c.claimed_by] : [])],
      <string[]>[]
    );
    const { rowsByKey: userRowsById } = await this._usersTable.findKeyRows(
      (r) => r.id,
      relatedUserIds
    );

    return shareRows.map((r) =>
      rowToShare(r, userRowsById[r.created_by], userRowsById[r.claimed_by])
    );
  }

  async insertShare(share: Share): Promise<Share> {
    const { shareRow: newRow, createdByRow, claimedByRow } = shareToRow(share);
    const { insertedRow } = await this._sharesTable.insertRow(newRow);

    return rowToShare(insertedRow, createdByRow, claimedByRow);
  }

  async updateShare(share: Share): Promise<void> {
    await this._sharesTable.updateRow((r) => r.id === share.id, {
      claimed_by: share.claimedBy?.id,
      claimed: share.claimed?.toISO(),
    });
  }
}
