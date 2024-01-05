import { Response } from "express";
import {
  Authenticator,
  FileInfo,
  Invite,
  MediaType,
  RegisteredAuthenticator,
  Share,
  User,
} from "./entity";

export interface IDataProvider {
  initialize(): Promise<void>;

  // users

  getUserCount(): Promise<number>;

  findUserById(userID: string): Promise<User | undefined>;

  findUserByName(username: string): Promise<User | undefined>;

  insertUser(user: User): Promise<User>;

  updateUser(user: User): Promise<void>;

  // credentials

  findCredentialById(
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  findUserCredential(
    userID: string,
    credentialID: string
  ): Promise<RegisteredAuthenticator | undefined>;

  findCredentialsByUser(userID: string): Promise<RegisteredAuthenticator[]>;

  insertCredential(userID: string, credential: Authenticator): Promise<void>;

  deleteCredential(credentialID: string): Promise<void>;

  // invites

  findInviteById(inviteId: string): Promise<Invite | undefined>;

  insertInvite(invite: Invite): Promise<Invite>;

  updateInvite(invite: Invite): Promise<void>;

  // shares

  findShareById(shareId: string): Promise<Share | undefined>;

  findSharesByClaimedUserId(userID: string): Promise<Share[]>;

  findSharesByCreatedUserId(userID: string): Promise<Share[]>;

  insertShare(share: Share): Promise<Share>;

  updateShare(share: Share): Promise<void>;
}

export interface IFileProvider {
  initialize(): Promise<void>;

  getFileInfo(url: string): Promise<FileInfo | undefined>;

  sendFile(file: FileInfo, mediaType: MediaType, destination: Response): void;
}
