# Project Configuration

The following environment variables are used by the server.

## Web application settings

### `NODE_ENV`

The node environment.

For local development, use `development`. In this mode, the server will use HTTPS and look for a local [self-signed TLS certificate](./README.md#self-signed-tls-certificate).

The [Dockerfile](./Dockerfile) sets this variable to `production` and uses HTTP instead of HTTPS. Therefore, when running in Docker, TLS must be provided by the infrastructure.

### `PORT`

The HTTP listening port.

For local development, use `443` since TLS will be active. Use another port if 443 is in use.

For production, the [Dockerfile](./Dockerfile) sets this to `8000`.

### `LOG_LEVEL`

The minimum log level to output in the logs.

For local development, set to `debug`. Set to `info` or other values for production.

### `RP_ID`

The ID of the RP (FIDO) server. Specifically, this is the hostname used to register and authenticate FIDO credentials.  
Eg. `example.com`

For local development, set to `skattlada.dev`.

### `RP_NAME`

The friendly name of the RP (FIDO) server.  
Eg. `Bob's Beekeeping`

### `BASE_URL`

The base URL of the server. This should be the protocol scheme and the `RP_ID`.  
Eg. `https://example.com`

> Do not use a trailing slash

For local development, set to `https://skattlada.dev`, appending `:PORT` if something besides `443`.

### `COOKIE_SECRET`

An arbitrary key used to encrypt and decrypt HTTP session cookies.

### `CSRF_SECRET`

An arbitrary key used to encrypt and decrypt CSRF tokens.

## Sharing settings

### `MAX_INVITE_LIFETIME`

The maximum lifetime of an invite for a new user before it expires, expressed as an [ISO 8601 duration string](https://en.wikipedia.org/wiki/ISO_8601#Durations).
Eg. `P2D` (two days)

## Data settings

### `DATA_PROVIDER_NAME`

The [`IDataProvider`](./src/types/data.ts) implementation to use with the server. Possible values:

- `in-memory`: [`InMemoryDataProvider`](./src/data/data-providers/in-memory.ts): A nonpersistent, resetting whenever the server restarts
- `google-sheets`: [`GoogleSheetsDataProvider`](./src/data/data-providers/google-sheets/index.ts): Uses a Google Spreadsheet as a database

  > If used, the [`GOOGLE_SPREADSHEET_ID`](#google_spreadsheet_id) and [Google credential settings](#google-credential-settings) must be configured

For local development, it's recommended to use `in-memory` unless you want to test with a different provider.

### `GOOGLE_SPREADSHEET_ID`

The [spreadsheet ID](https://developers.google.com/sheets/api/guides/concepts) or Google Drive file ID of the Google Spreadsheet to use as the database if [`DATA_PROVIDER_NAME`](#data_provider_name) = `google-sheets`.

> The configured [service account](#google_auth_client_email) must have `Editor` access to this spreadsheet in Google Drive.

### `FILE_PROVIDER_NAME`

The [`IFileProvider`](./src/types/data.ts) implementation to use with the server. Possible values:

- `local`: [`LocalFileProvider`](./src/data/file-providers/local.ts): Shares a set of local test files
- `google-drive`: [`GoogleDriveFileProvider`](./src/data/file-providers/google-drive.ts): Shares files from Google Drive

  > If used, the [Google credential settings](#google-credential-settings) must be configured

For local development, it's recommended to use `local` unless you want to test another provider.

### `METADATA_PROVIDER_NAME`

The [`IMetadataProvider`](./src/types/data.ts) implementation to use with the server. Possible values:

- `passkey-authenticator-aaguids`: [`PasskeyProviderAaguidsMetadataProvider`](./src/data/metadata-providers/google-drive.ts): Sources FIDO metadata with data found in the [passkeydeveloper/passkey-authenticator-aaguids](https://github.com/passkeydeveloper/passkey-authenticator-aaguids) Github project, specifically from this file:  
  <https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json>
- `local`: [`LocalMetadataProvider`](./src/data/metadata-providers/local.ts): Sources FIDO metadata with data found in the local [`test-metadata.json`](./src/data/metadata-providers/test-metadata.json) file

  > The `local` metadata provider exposes a commonly used _subset_ of the data provided by the `passkey-authenticator-aaguids` metadata provider

## Google credential settings

Some features require access to Google APIs. Perform these steps to obtain a Google Service Account which provides the necessary credentials.

1. Create a Service Account credential in the Google Cloud Console
1. Add a new JSON key to the Service Account, which downloads a `.json` key file

### `GOOGLE_AUTH_CLIENT_EMAIL`

The `client_email` field from the JSON key file.

### `GOOGLE_AUTH_PRIVATE_KEY`

The `private_key` field from the JSON key file.

### `GOOGLE_AUTH_PRIVATE_KEY_BASE64`

Alternative to setting `GOOGLE_AUTH_PRIVATE_KEY` if the environment doesn't support multi-line values, which many don't. Obtain using the following steps:

1. Make sure you have the [json](https://www.npmjs.com/package/json) CLI tool installed
1. Use the following command to extract the private key from the key file into a base-64 string:

   ```shell
   cat /path/to/google-key-file.json | json private_key | base64
   ```

1. Copy the resulting value into the environment variable
