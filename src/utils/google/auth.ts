import { GoogleAuth } from "google-auth-library";

import {
  googleAuthClientEmail as client_email,
  googleAuthPrivateKey as private_key,
} from "../config";

export function buildAuth(scopes: string[]): GoogleAuth {
  return new GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes,
  });
}
