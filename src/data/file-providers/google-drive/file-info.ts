import { drive_v3 } from "@googleapis/drive";
import { StatusCodes } from "http-status-codes";

import { drive } from "../../../utils/google/drive/client";

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
