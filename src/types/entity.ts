import {
  AuthenticatorTransport,
  CredentialDeviceType,
} from "@simplewebauthn/types";
import { DateTime, Duration } from "luxon";

export interface User {
  id: string;
  created: DateTime;
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export interface Authenticator {
  created: DateTime;
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  aaguid: string;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransport[];
}

export interface RegisteredAuthenticator extends Authenticator {
  user: User;
}

export interface SimpleMetadataStatement {
  aaguid: string;
  description: string;
  icon?: string;
}

export type FileType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "image"
  | "video";

export interface MediaType {
  name: string;
  description: string;
  extension: string;
}

export interface FileInfo {
  id: string;
  title: string;
  type: FileType;
  availableMediaTypes: MediaType[];
}

export interface RegisterableSource {
  id: string;
  sourceType: "invite" | "share";
  isAdmin: boolean;
  created: DateTime;
  createdBy: User;
  claimedBy?: User;
  claimed?: DateTime;
}

export interface Invite extends RegisterableSource {}

export interface Share extends RegisterableSource {
  backingUrl: string;
  fileTitle: string;
  fileType: FileType;
  availableMediaTypes: MediaType[];
  toUsername?: string;
  toGroup?: string;
  expireDuration?: Duration;
}
