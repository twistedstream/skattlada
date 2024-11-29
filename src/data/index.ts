import assert from "assert";

import { IDataProvider, IFileProvider, IMetadataProvider } from "../types/data";
import {
  dataProviderName,
  fileProviderName,
  metadataProviderName,
} from "../utils/config";
import { logger } from "../utils/logger";
import { GoogleSheetsDataProvider } from "./data-providers/google-sheets";
import { InMemoryDataProvider } from "./data-providers/in-memory";
import { GoogleDriveFileProvider } from "./file-providers/google-drive";
import { LocalFileProvider } from "./file-providers/local";
import { LocalMetadataProvider } from "./metadata-providers/local";
import { PasskeyProviderAaguidsMetadataProvider } from "./metadata-providers/passkey-authenticator-aaguids";

let dataProvider: IDataProvider;
let fileProvider: IFileProvider;
let metadataProvider: IMetadataProvider;

export function getDataProvider(): IDataProvider {
  if (!dataProvider) {
    assert(dataProviderName, "Missing config: data provider name");
    switch (dataProviderName) {
      case "in-memory":
        dataProvider = new InMemoryDataProvider({
          users: [],
          credentials: [],
          invites: [],
          shares: [],
        });
        break;

      case "google-sheets":
        dataProvider = new GoogleSheetsDataProvider();
        break;
    }

    assert(dataProvider, `Unsupported data provider name: ${dataProviderName}`);

    logger.info(`Data provider: ${dataProviderName}`);
  }

  return dataProvider;
}

export function getFileProvider(): IFileProvider {
  if (!fileProvider) {
    assert(fileProviderName, "Missing config: file provider name");
    switch (fileProviderName) {
      case "local":
        fileProvider = new LocalFileProvider();
        break;

      case "google-drive":
        fileProvider = new GoogleDriveFileProvider();
        break;
    }

    assert(fileProvider, `Unsupported file provider name: ${fileProviderName}`);

    logger.info(`File provider: ${fileProviderName}`);
  }

  return fileProvider;
}

export function getMetadataProvider(): IMetadataProvider {
  if (!metadataProvider) {
    assert(metadataProviderName, "Missing config: metadata provider name");
    switch (metadataProviderName) {
      case "local":
        metadataProvider = new LocalMetadataProvider();
        break;

      case "passkey-authenticator-aaguids":
        metadataProvider = new PasskeyProviderAaguidsMetadataProvider();
        break;
    }

    assert(
      metadataProvider,
      `Unsupported metadata provider name: ${metadataProviderName}`,
    );

    logger.info(`Metadata provider: ${metadataProviderName}`);
  }

  return metadataProvider;
}
