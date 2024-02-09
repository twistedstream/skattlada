import { drive as googleDrive } from "@googleapis/drive";
import { GoogleAuth } from "google-auth-library";

import {
  googleAuthClientEmail as client_email,
  googleAuthPrivateKey as private_key,
} from "../../config";

export const drive = googleDrive({
  version: "v3",
  auth: new GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  }),
});
