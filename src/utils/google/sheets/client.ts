import { sheets as googleSheets } from "@googleapis/sheets";
import { buildAuth } from "../auth";

export const sheets = googleSheets({
  version: "v4",
  auth: buildAuth(["https://www.googleapis.com/auth/spreadsheets"]),
});
