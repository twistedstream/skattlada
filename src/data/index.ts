import assert from "assert";

import { IDataProvider, IFileProvider } from "../types/data";
import { dataProviderName, fileProviderName } from "../utils/config";
import { logger } from "../utils/logger";
import { GoogleSheetsDataProvider } from "./data-providers/google-sheets";
import { InMemoryDataProvider } from "./data-providers/in-memory";
import { GoogleDriveFileProvider } from "./file-providers/google-drive";
import { LocalFileProvider } from "./file-providers/local";

let dataProvider: IDataProvider;
let fileProvider: IFileProvider;

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
