import { cloneDeep } from "lodash";

import { IDataProvider } from "../../types/data";
import {
  Authenticator,
  Invite,
  RegisteredAuthenticator,
  Share,
  User,
} from "../../types/entity";
import { InMemoryDataProviderOptions } from "../../types/test";
import { assertValue } from "../../utils/error";
import { logger } from "../../utils/logger";

export class InMemoryDataProvider implements IDataProvider {
  private _initialized: boolean = false;
  private _users: User[];
  private _credentials: RegisteredAuthenticator[];
  private _invites: Invite[];
  private _shares: Share[];

  constructor({
    users,
    credentials,
    invites,
    shares,
  }: InMemoryDataProviderOptions) {
    this._users = users || [];
    this._credentials = credentials || [];
    this._invites = invites || [];
    this._shares = shares || [];

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
      logger.info("In-memory data provider initialized");
      this._initialized = true;
    }
  }

  // users

  async getUserCount(): Promise<number> {
    return this._users.length;
  }

  async findUserById(userID: string): Promise<User | undefined> {
    const user = this._users.find((u) => u.id === userID);
    if (user) {
      return cloneDeep(user);
    }
  }

  async findUserByName(username: string): Promise<User | undefined> {
    const user = this._users.find((u) => u.username === username);

    if (user) {
      return cloneDeep(user);
    }
  }

  async insertUser(user: User): Promise<User> {
    const clone = cloneDeep(user);
    this._users.push(clone);
    logger.debug(this._users, "Users after insert");

    return cloneDeep(clone);
  }

  async updateUser(user: User): Promise<void> {
    const foundUser = this._users.find((u) => u.id === user.id);
    if (foundUser) {
      // only these fields can be updated
      foundUser.displayName = user.displayName;
    }
  }

  // credentials

  async findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const credential = this._credentials.find(
      (p) => p.credentialID === credentialID
    );
    if (credential) {
      return cloneDeep(credential);
    }
  }

  async findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined> {
    const credential = this._credentials.find(
      (p) => p.user.id === userID && p.credentialID === credentialID
    );
    if (credential) {
      return cloneDeep(credential);
    }
  }

  async findCredentialsByUser(
    userID: string
  ): Promise<RegisteredAuthenticator[]> {
    const credentials = this._credentials.filter((p) => p.user.id === userID);
    return cloneDeep(credentials);
  }

  async insertCredential(
    userID: string,
    credential: Authenticator
  ): Promise<void> {
    const user = assertValue(
      await this.findUserById(userID),
      "User does not exist"
    );
    const registeredCredential: RegisteredAuthenticator = {
      ...cloneDeep(credential),
      user,
    };
    this._credentials.push(registeredCredential);
    logger.debug(this._credentials, "Credentials after insert");
  }

  async deleteCredential(credentialID: string): Promise<void> {
    const indexToDelete = this._credentials.findIndex(
      (c) => c.credentialID === credentialID
    );
    if (indexToDelete >= 0) {
      this._credentials.splice(indexToDelete, 1);
      logger.debug(this._credentials, "Credentials after delete");
    }
  }

  // invites

  async findInviteById(inviteId: string): Promise<Invite | undefined> {
    const invite = this._invites.find((i) => i.id === inviteId);
    if (invite) {
      return cloneDeep(invite);
    }
  }

  async insertInvite(invite: Invite): Promise<Invite> {
    const clone = cloneDeep(invite);
    this._invites.push(clone);
    logger.debug(this._invites, "Invites after insert");

    return cloneDeep(clone);
  }

  async updateInvite(invite: Invite): Promise<void> {
    const foundInvite = this._invites.find((i) => i.id === invite.id);
    if (foundInvite) {
      foundInvite.claimed = invite.claimed;
      foundInvite.claimedBy = invite.claimedBy;
    }
  }

  // shares

  async findShareById(shareId: string): Promise<Share | undefined> {
    const share = this._shares.find((s) => s.id === shareId);
    if (share) {
      return cloneDeep(share);
    }
  }

  async findSharesByClaimedUserId(userID: string): Promise<Share[]> {
    const shares = this._shares.filter((s) => s.claimedBy?.id === userID);
    return cloneDeep(shares);
  }

  async findSharesByCreatedUserId(userID: string): Promise<Share[]> {
    const shares = this._shares.filter((s) => s.createdBy.id === userID);
    return cloneDeep(shares);
  }

  async insertShare(share: Share): Promise<Share> {
    const clone = cloneDeep(share);
    this._shares.push(clone);
    logger.debug(this._shares, "Shares after insert");

    return cloneDeep(clone);
  }

  async updateShare(share: Share): Promise<void> {
    const foundShare = this._shares.find((s) => s.id === share.id);
    if (foundShare) {
      foundShare.claimed = share.claimed;
      foundShare.claimedBy = share.claimedBy;
    }
  }
}
