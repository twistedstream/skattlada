import {
  CsrfTokenCreator,
  DoubleCsrfConfigOptions,
  doubleCsrf,
  doubleCsrfProtection,
} from "csrf-csrf";
import { Request } from "express";

import { csrfSecret } from "./config";

const doubleCsrfOptions: DoubleCsrfConfigOptions = {
  getSecret: () => csrfSecret,
  getTokenFromRequest: (req: Request) => req.body.csrf_token,
  cookieOptions: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

const {
  generateToken, // Use this in your routes to provide a CSRF hash + token cookie and token.
  doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf(doubleCsrfOptions);

export const generateCsrfToken: CsrfTokenCreator = generateToken;

export const validateCsrfToken: () => doubleCsrfProtection = () =>
  doubleCsrfProtection;
