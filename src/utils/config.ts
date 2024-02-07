import "dotenv/config";
import { Duration } from "luxon";

// Exported environment variables

export const port = Number(process.env.PORT);
export const environment = <string>process.env.NODE_ENV;
export const logLevel = <string>process.env.LOG_LEVEL;
export const rpID = <string>process.env.RP_ID;
export const rpName = <string>process.env.RP_NAME;
export const baseUrl = <string>process.env.BASE_URL;
export const cookieSecret = <string>process.env.COOKIE_SECRET;
export const csrfSecret = <string>process.env.CSRF_SECRET;
export const maxInviteLifetime = Duration.fromISO(
  <string>process.env.MAX_INVITE_LIFETIME
);
export const dataProviderName = <string>process.env.DATA_PROVIDER_NAME;
export const googleSpreadsheetId = <string>process.env.GOOGLE_SPREADSHEET_ID;
export const fileProviderName = <string>process.env.FILE_PROVIDER_NAME;
export const googleAuthClientEmail = <string>(
  process.env.GOOGLE_AUTH_CLIENT_EMAIL
);
export const googleAuthPrivateKey =
  <string>process.env.GOOGLE_AUTH_PRIVATE_KEY ??
  (process.env.GOOGLE_AUTH_PRIVATE_KEY_BASE64
    ? Buffer.from(
        <string>process.env.GOOGLE_AUTH_PRIVATE_KEY_BASE64,
        "base64"
      ).toString("utf-8")
    : undefined);
export const metadataUrl = <string>process.env.METADATA_URL;

// Package configuration

/* istanbul ignore next */
const packageDir = environment === "production" ? "../" : "../../";
const packagePath = `${packageDir}package.json`;
const packageJson = require(packagePath);

export const packageName = <string>packageJson.name;
export const packageDescription = <string>packageJson.description;
export const packageVersion = <string>packageJson.version;
