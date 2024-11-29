import { NextFunction, Request, Response } from "express";
import querystring from "querystring";

import { UserVerificationRequirement } from "@simplewebauthn/types";
import {
  AuthenticatedSession,
  AuthenticatingSession,
  RegisterableSession,
  RegisteringSession,
} from "../../types/auth";
import {
  RegisterableSource,
  RegisteredAuthenticator,
  User,
} from "../../types/entity";
import {
  AuthenticatedRequest,
  RequestWithTypedQuery,
} from "../../types/express";
import { now } from "../../utils/time";
import { ForbiddenError, UnauthorizedError } from "../error";
import {
  fixRegisterableSource,
  fixRegisteredAuthenticator,
  fixUser,
} from "./deserialize";

// auth helpers

export function capturePreAuthState(
  req: RequestWithTypedQuery<{ return_to: string }>,
) {
  req.session = req.session || {};
  const { return_to } = req.query;
  req.session.return_to = return_to;
}

export function authorizeRegistration(
  req: Request,
  source: RegisterableSource,
) {
  req.session = req.session || {};

  req.session.registerable = <RegisterableSession>{
    source,
  };
}

export function beginSignup(
  req: Request,
  challenge: string,
  registeringUser: User,
) {
  req.session = req.session || {};

  req.session.registration = <RegisteringSession>{
    registeringUser,
    challenge,
  };
}

export function beginSignIn(
  req: Request,
  challenge: string,
  existingUser?: User,
  userVerification?: UserVerificationRequirement,
) {
  req.session = req.session || {};

  req.session.authentication = <AuthenticatingSession>{
    authenticatingUser: existingUser,
    userVerification,
    challenge,
  };
}

export function signIn(
  req: Request,
  credential: RegisteredAuthenticator,
): string {
  req.session = req.session || {};

  // update session
  req.session.authentication = <AuthenticatedSession>{
    credential,
    time: now().toMillis(),
  };

  // get return_to
  const returnTo = req.session.return_to || "/";

  // clear temp session values
  delete req.session.registration;
  delete req.session.return_to;

  return returnTo;
}

export function signOut(req: Request) {
  req.session = null;
}

export function getAuthentication(
  req: Request,
): AuthenticatingSession | undefined {
  const authentication: AuthenticatingSession = req.session?.authentication;
  if (authentication) {
    if (authentication.authenticatingUser) {
      fixUser(authentication.authenticatingUser);
    }

    return authentication;
  }
}

export function getRegistration(req: Request): RegisteringSession | undefined {
  const registration: RegisteringSession = req.session?.registration;

  if (registration) {
    if (registration.registeringUser) {
      fixUser(registration.registeringUser);
    }

    return registration;
  }
}

export function getRegisterable(req: Request): RegisterableSession | undefined {
  const registerable: RegisterableSession = req.session?.registerable;

  if (registerable) {
    fixRegisterableSource(registerable.source);

    return registerable;
  }
}

export function clearRegisterable(req: Request) {
  req.session = req.session || {};

  delete req.session.registerable;
}

export function redirectToRegister(
  req: Request,
  res: Response,
  hideSignInLink: boolean,
) {
  const return_to = req.originalUrl;
  res.redirect(
    `/register?${querystring.stringify({
      return_to,
      ...(hideSignInLink && { hide_sign_in: true }),
    })}`,
  );
}

export function redirectToLogin(req: Request, res: Response) {
  const return_to = req.originalUrl;
  res.redirect(`/login?${querystring.stringify({ return_to })}`);
}

// middleware

export function auth() {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    // authenticated user:
    // - has session with authentication state with a set time field
    // FUTURE: only set user if session hasn't expired
    if (req.session?.authentication?.time) {
      const authentication: AuthenticatedSession = req.session.authentication;
      fixRegisteredAuthenticator(authentication.credential);

      req.user = authentication.credential.user;
      req.credential = authentication.credential;
    }

    return next();
  };
}

export function requiresAuth() {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(UnauthorizedError());
    }

    return next();
  };
}

export function requiresAdmin() {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user?.isAdmin) {
      return next(ForbiddenError("Requires admin role"));
    }

    return next();
  };
}
