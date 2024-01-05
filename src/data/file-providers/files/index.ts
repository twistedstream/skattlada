import { resolveFileType } from "friendly-mimes";
import { Dictionary, keyBy } from "lodash";
import { readdir } from "node:fs/promises";

import fs, { ReadStream } from "node:fs";
import path from "node:path";
import { FileInfo, MediaType } from "../../../types/entity";
import { assertValue } from "../../../utils/error";
import { unique } from "../../../utils/identifier";
import { fileTypeFromMediaType } from "../../../utils/media-type";

const BASE_URL = "https://example.com/";

export type LocalFiles = { all: FileInfo[]; byUrl: Dictionary<FileInfo> };

export async function loadFiles(): Promise<LocalFiles> {
  const localFiles = await readdir(__dirname);
  const all: FileInfo[] = localFiles
    // initial structure: name, extension, MIME type
    .map((fileName) => {
      const parts = fileName.split(".");
      const name = parts.slice(0, parts.length - 1).join(".");
      const ext = parts.length > 1 ? parts[parts.length - 1] : "";

      let mime: { mime: string; name: string } | undefined;
      try {
        mime = resolveFileType(`${ext ? "." : ""}${ext}`);
      } catch {}

      return { name, ext, fileName, mime };
    })
    // filter out files with no known MIME type
    .filter((f) => !!f.mime)
    // attach media type and file type
    .map((f) => {
      const { name, ext, fileName } = f;
      const mime = assertValue(f.mime);

      const mediaType: MediaType = {
        name: mime.mime,
        description: mime.name,
        extension: ext,
      };
      const fileType = fileTypeFromMediaType(mediaType);

      return { name, fileName, fileType, mediaType };
    })
    // filter out unknown file types
    .filter((f) => !!f.fileType)
    // final structure
    .map((f) => {
      const { name, mediaType } = f;
      const fileType = assertValue(f.fileType);

      return {
        id: unique(),
        title: name,
        type: fileType,
        availableMediaTypes: [mediaType],
      };
    });

  const files = {
    all,
    byUrl: keyBy(all, (f) => `${BASE_URL}${f.id}`),
  };

  return files;
}

export function getFileStream(fileName: string): ReadStream {
  const filePath = path.join(__dirname, fileName);
  const fileStream = fs.createReadStream(filePath);
  return fileStream;
}
