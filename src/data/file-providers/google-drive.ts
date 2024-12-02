import { Response } from "express";

import { IFileProvider } from "../../types/data";
import { FileInfo, MediaType } from "../../types/entity";
import { assertValue, NotFoundError } from "../../utils/error";
import { drive } from "../../utils/google/drive/client";
import { fileIdFromUrl, getDriveFileInfo } from "../../utils/google/drive/file";
import { logger } from "../../utils/logger";
import {
  fileTypeFromMediaType,
  mediaTypeFromMimeType,
} from "../../utils/media-type";

export class GoogleDriveFileProvider implements IFileProvider {
  private _initialized: boolean = false;

  constructor() {
    // bind method "this"'s to instance "this"
    this.initialize = this.initialize.bind(this);
    this.getFileInfo = this.getFileInfo.bind(this);
    this.sendFile = this.sendFile.bind(this);
  }

  // IDataProvider implementation

  async initialize(): Promise<void> {
    if (!this._initialized) {
      logger.info("Google Drive file provider initialized");
      this._initialized = true;
    }
  }

  async getFileInfo(url: string): Promise<FileInfo | undefined> {
    if (!this._initialized) {
      throw new Error("Provider not initialized");
    }

    const fileId = fileIdFromUrl(url);
    if (!fileId) {
      return;
    }

    const info = await getDriveFileInfo(fileId);
    if (!info) {
      return;
    }

    const mediaType = mediaTypeFromMimeType(assertValue(info.mimeType));
    if (!mediaType) {
      throw new Error(
        `Google Drive file (${fileId}) has an unknown media type: ${info.mimeType}`,
      );
    }

    const type = assertValue(fileTypeFromMediaType(mediaType));
    return {
      id: assertValue(info.id),
      title: assertValue(info.name),
      type,
      availableMediaTypes: info.exportLinks
        ? Object.keys(info.exportLinks).reduce((p: MediaType[], c: string) => {
            const mediaType = mediaTypeFromMimeType(c);
            if (mediaType) {
              return [...p, mediaType];
            }
            return p;
          }, [])
        : [mediaType],
    };
  }

  // NOTE: caller does not need to await a Promise from sendFile
  async sendFile(file: FileInfo, mediaType: MediaType, destination: Response) {
    if (!this._initialized) {
      throw new Error("Provider not initialized");
    }

    const { id: fileId } = file;
    const { name: mimeType } = mediaType;

    const info = await getDriveFileInfo(fileId);
    if (!info) {
      throw NotFoundError();
    }

    const exportable = !!info.exportLinks;

    const fileExtension = exportable ? `.${mediaType.extension}` : "";
    const fileName = `${file.title}${fileExtension}`;
    destination.attachment(fileName);

    const { data: stream } = exportable
      ? // perform export if a Docs Editor (exportable) file
        await drive.files.export(
          { fileId, mimeType },
          { responseType: "stream" },
        )
      : // otherwise perform direct download
        await drive.files.get(
          {
            fileId,
            alt: "media",
          },
          { responseType: "stream" },
        );

    stream.on("error", (err) => {
      throw err;
    });
    stream.pipe(destination);
  }
}
