import { drive_v3 } from "@googleapis/drive";
import { StatusCodes } from "http-status-codes";

import { drive } from "./client";

const FILE_ID_PATTERNS = [
  /^https:\/\/docs\.google\.com\/(?:spreadsheets|document|presentation)\/d\/(?<fileId>[^\/\?#]*)/,
  /^https:\/\/drive\.google\.com\/file\/d\/(?<fileId>[^\/\?#]*)/,
];

export function fileIdFromUrl(url: string): string | undefined {
  for (const pattern of FILE_ID_PATTERNS) {
    const fileId = pattern.exec(url)?.groups?.fileId;
    if (fileId) {
      return fileId;
    }
  }
}

export async function getDriveFileInfo(
  fileId: string,
): Promise<drive_v3.Schema$File | undefined> {
  try {
    const file = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,exportLinks",
    });
    return file.data;
  } catch (err: any) {
    if (err.status === StatusCodes.NOT_FOUND) {
      return;
    }
    throw err;
  }
}
