const { fetchSpreadsheet, applySpreadsheetChanges } = require("./utils");
require("dotenv").config({ path: __dirname + "/../.env" });

const schema = require("./db-schema.json");

// provider helper functions

async function dropGoogleSheetsSchema(spreadsheetId, { dryRun }) {
  const { sheetsByName } = await fetchSpreadsheet(spreadsheetId);

  const requests = [];

  console.log();
  console.log("Discovering sheets (tables) to drop:");
  for (const table of schema.tables) {
    const message = `- ${table.name}: `;
    const sheet = sheetsByName.get(table.name);

    if (sheet) {
      console.log(`${message}⛔️ Exists and will be dropped`);

      const {
        properties: { sheetId },
      } = sheet;
      requests.push({ deleteSheet: { sheetId } });
      sheetsByName.delete(table.name);
    } else {
      console.log(`${message}✅ Does not exist`);
    }
  }

  if (sheetsByName.size === 0) {
    console.log();
    console.log(
      "An empty sheet will be added since all other sheets will be removed",
    );
    requests.unshift({ addSheet: {} });
  }

  console.log();
  await applySpreadsheetChanges(spreadsheetId, requests, dryRun);
}

(async () => {
  console.log("Drop Schema script");
  const args = process.argv.slice(2);
  const dryRun = args.some((a) => ["-d", "--dry-run"].includes(a));
  console.log("- dry run:", dryRun);

  const { DATA_PROVIDER_NAME, GOOGLE_SPREADSHEET_ID: spreadsheetId } =
    process.env;

  switch (DATA_PROVIDER_NAME) {
    case "google-sheets":
      await dropGoogleSheetsSchema(spreadsheetId, { dryRun });
      break;

    default:
      console.error(`DATA_PROVIDER_NAME not supported: ${DATA_PROVIDER_NAME}`);
      break;
  }
})();
