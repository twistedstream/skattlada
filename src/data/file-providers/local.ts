import { Response } from "express";
import { cloneDeep } from "lodash";

import { IFileProvider } from "../../types/data";
import { FileInfo, MediaType } from "../../types/entity";
import { logger } from "../../utils/logger";
import { LocalFiles, getFileStream, loadFiles } from "./files";

export class LocalFileProvider implements IFileProvider {
  constructor() {
    // bind method "this"'s to instance "this"
    this.initialize = this.initialize.bind(this);
    this.getFileInfo = this.getFileInfo.bind(this);
    this.sendFile = this.sendFile.bind(this);
  }

  files: LocalFiles | undefined;

  // IFileProvider implementation

  async initialize(): Promise<void> {
    if (!this.files) {
      this.files = await loadFiles();

      logger.info(this.files.byUrl, "Local file provider initialized");
    }
  }

  async getFileInfo(url: string): Promise<FileInfo | undefined> {
    if (!this.files) {
      throw new Error("Provider not initialized");
    }

    const file = this.files.byUrl[url];
    if (file) {
      return cloneDeep(file);
    }
  }

  sendFile(file: FileInfo, mediaType: MediaType, destination: Response) {
    if (!this.files) {
      throw new Error("Provider not initialized");
    }

    const fileName = `${file.title}.${mediaType.extension}`;
    destination.attachment(fileName);

    const stream = getFileStream(fileName);
    stream.on("error", (err) => {
      throw err;
    });
    stream.pipe(destination);
  }
}
