import { UserVerificationRequirement } from "@simplewebauthn/types";
import { RegisterableSource, RegisteredAuthenticator, User } from "./entity";

export interface RegisterableSession {
  source: RegisterableSource;
}

export interface RegisteringSession {
  registeringUser: User;
  challenge: string;
}

export interface AuthenticatingSession {
  authenticatingUser?: User;
  userVerification?: UserVerificationRequirement;
  challenge: string;
}

export interface AuthenticatedSession {
  credential: RegisteredAuthenticator;
  time: number;
}
