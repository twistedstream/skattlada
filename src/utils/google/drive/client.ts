import { drive as googleDrive } from "@googleapis/drive";
import { buildAuth } from "../auth";

export const drive = googleDrive({
  version: "v3",
  auth: buildAuth(["https://www.googleapis.com/auth/drive.readonly"]),
});
