import { IDataProvider } from "../../../types/data";
import {
  Authenticator,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "../../../types/entity";
import { assertValue } from "../../../utils/error";
import {
  countRows,
  deleteRow,
  findKeyRows,
  findRow,
  findRows,
  insertRow,
  updateRow,
} from "../../../utils/google/sheets";
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

  async getUserCount(): Promise<number> {
    return countRows(USER_SHEET_NAME);
  }

  async findUserById(userID: string): Promise<User | undefined> {
    const { row } = await findRow(USER_SHEET_NAME, (r) => r.id === userID);
    if (row) {
      return rowToUser(row);
    }
  }

  async findUserByName(username: string): Promise<User | undefined> {
    const { row } = await findRow(
      USER_SHEET_NAME,
      (r) => r.username === username
    );
    if (row) {
      return rowToUser(row);
    }
  }

  async insertUser(user: User): Promise<User> {
    const newRow = userToRow(user);
    const { insertedRow } = await insertRow(
      USER_SHEET_NAME,
      newRow,
      USER_CONSTRAINTS
    );
    return rowToUser(insertedRow);
  }

  async updateUser(user: User): Promise<void> {
    await updateRow(
      USER_SHEET_NAME,
      (r) => r.id === user.id,
      { display_name: user.displayName },
      USER_CONSTRAINTS
    );
  }

  // credentials

  async findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const { row: credentialRow } = await findRow(
      CREDENTIAL_SHEET_NAME,
      (r) => r.id === credentialID
    );
    if (credentialRow) {
      const { row: userRow } = await findRow(
        USER_SHEET_NAME,
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
      findRow(USER_SHEET_NAME, (r) => r.id === userID),
      findRow(
        CREDENTIAL_SHEET_NAME,
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
      findRow(USER_SHEET_NAME, (r) => r.id === userID),
      findRows(CREDENTIAL_SHEET_NAME, (r) => r.user_id === userID),
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
    const { row: userRow } = await findRow(
      USER_SHEET_NAME,
      (r) => r.id === userID
    );
    assertValue(userRow, "User does not exist");

    const credentialRow = credentialToRow(credential, userID);

    await insertRow(
      CREDENTIAL_SHEET_NAME,
      credentialRow,
      CREDENTIAL_CONSTRAINTS
    );
  }

  async deleteCredential(credentialID: string): Promise<void> {
    return deleteRow(CREDENTIAL_SHEET_NAME, (r) => r.id === credentialID);
  }

  // invites

  async findInviteById(inviteId: string): Promise<Invite | undefined> {
    const { row: inviteRow } = await findRow(
      INVITE_SHEET_NAME,
      (r) => r.id === inviteId
    );
    if (inviteRow) {
      const relatedUserIds = [
        inviteRow.created_by,
        ...(inviteRow.claimed_by ? [inviteRow.claimed_by] : []),
      ];
      const { rowsByKey: userRowsById } = await findKeyRows(
        USER_SHEET_NAME,
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
    const { insertedRow } = await insertRow(
      INVITE_SHEET_NAME,
      newRow,
      INVITE_CONSTRAINTS
    );

    return rowToInvite(insertedRow, createdByRow, claimedByRow);
  }

  async updateInvite(invite: Invite): Promise<void> {
    await updateRow(
      INVITE_SHEET_NAME,
      (r) => r.id === invite.id,
      { claimed_by: invite.claimedBy?.id, claimed: invite.claimed?.toISO() },
      INVITE_CONSTRAINTS
    );
  }

  // shares

  async findShareById(shareId: string): Promise<Share | undefined> {
    const { row: shareRow } = await findRow(
      SHARE_SHEET_NAME,
      (r) => r.id === shareId
    );
    if (shareRow) {
      const relatedUserIds = [
        shareRow.created_by,
        ...(shareRow.claimed_by ? [shareRow.claimed_by] : []),
      ];
      const { rowsByKey: userRowsById } = await findKeyRows(
        USER_SHEET_NAME,
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
    const { rows: shareRows } = await findRows(
      SHARE_SHEET_NAME,
      (r) => r.claimed_by === userID
    );

    const relatedUserIds = shareRows.reduce(
      (p, c) => [...p, c.created_by, c.claimed_by],
      <string[]>[]
    );
    const { rowsByKey: userRowsById } = await findKeyRows(
      USER_SHEET_NAME,
      (r) => r.id,
      relatedUserIds
    );

    return shareRows.map((r) =>
      rowToShare(r, userRowsById[r.created_by], userRowsById[r.claimed_by])
    );
  }

  async findSharesByCreatedUserId(userID: string): Promise<Share[]> {
    const { rows: shareRows } = await findRows(
      SHARE_SHEET_NAME,
      (r) => r.created_by === userID
    );

    const relatedUserIds = shareRows.reduce(
      (p, c) => [...p, c.created_by, ...(c.claimed_by ? [c.claimed_by] : [])],
      <string[]>[]
    );
    const { rowsByKey: userRowsById } = await findKeyRows(
      USER_SHEET_NAME,
      (r) => r.id,
      relatedUserIds
    );

    return shareRows.map((r) =>
      rowToShare(r, userRowsById[r.created_by], userRowsById[r.claimed_by])
    );
  }

  async insertShare(share: Share): Promise<Share> {
    const { shareRow: newRow, createdByRow, claimedByRow } = shareToRow(share);
    const { insertedRow } = await insertRow(
      SHARE_SHEET_NAME,
      newRow,
      SHARE_CONSTRAINTS
    );

    return rowToShare(insertedRow, createdByRow, claimedByRow);
  }

  async updateShare(share: Share): Promise<void> {
    await updateRow(
      SHARE_SHEET_NAME,
      (r) => r.id === share.id,
      { claimed_by: share.claimedBy?.id, claimed: share.claimed?.toISO() },
      SHARE_CONSTRAINTS
    );
  }
}
