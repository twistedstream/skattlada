require("dotenv").config({ path: __dirname + "/../.env" });
const { GoogleAuth } = require("google-auth-library");
const { sheets } = require("@googleapis/sheets");

const schema = require("./db-schema.json");

const {
  DATA_PROVIDER_NAME,
  GOOGLE_AUTH_CLIENT_EMAIL: client_email,
  GOOGLE_AUTH_PRIVATE_KEY: private_key,
  GOOGLE_SPREADSHEET_ID: spreadsheetId,
} = process.env;

// provider helper functions

async function applyGoogleSheetsSchema() {
  const auth = new GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = sheets({ version: "v4", auth });

  console.log("Fetching existing spreadsheet...");
  let spreadsheet = await client.spreadsheets.get({ spreadsheetId });
  console.log(
    `Found spreadsheet: ${spreadsheet.data.spreadsheetId}: "${spreadsheet.data.properties.title}"`
  );

  let requests = [];

  console.log("Discovering missing sheets (tables):");
  for (const table of schema.tables) {
    const message = `- ${table.name}: `;
    const existingSheet = spreadsheet.data.sheets.find(
      (s) => s.properties.title === table.name
    );

    if (existingSheet) {
      console.log(`${message}✅ Exists`);
    } else {
      console.log(`${message}⛔️ Missing`);
      requests.push({
        addSheet: {
          properties: {
            title: table.name,
            gridProperties: {
              rowCount: 1,
              columnCount: table.columns.length,
            },
          },
        },
      });
    }
  }

  if (requests.length === 0) {
    console.log("No missing sheets to add");
  } else {
    console.log("Adding missing sheets...");

    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log("  Done ✅");

    // refetch the spreadsheet
    console.log("Refetching spreadsheet...");
    spreadsheet = await client.spreadsheets.get({ spreadsheetId });
  }

  requests = [];

  console.log("Discovering missing columns:");
  for (const table of schema.tables) {
    const getResult = await client.spreadsheets.values.get({
      spreadsheetId,
      range: `${table.name}!1:1`,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    const data = getResult.data.values ?? [[]];
    const columns = data[0];
    const missingColumns = table.columns.filter(
      (c) => !columns.includes(c.name)
    );

    const message = `- ${table.name}: `;

    if (missingColumns.length === 0) {
      console.log(`${message}✅ No missing columns`);
    } else {
      console.log(
        `${message}⛔️ Missing columns: ${missingColumns.map((c) => c.name).join(", ")}`
      );

      const existingSheet = spreadsheet.data.sheets.find(
        (s) => s.properties.title === table.name
      );
      if (!existingSheet) {
        throw new Error("Expected sheet not found:", table.name);
      }
      const {
        properties: {
          sheetId,
          gridProperties: { columnCount, rowCount },
        },
      } = existingSheet;

      const emptyEndColumns = columnCount - columns.length;

      // insert necessary empty columns at end
      const columnsToInsertCount = missingColumns.length - emptyEndColumns;
      if (columnsToInsertCount > 0) {
        requests.push({
          insertDimension: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: columnCount,
              endIndex: columnCount + columnsToInsertCount,
            },
            inheritFromBefore: true,
          },
        });

        console.log(`  > Will append ${columnsToInsertCount} empty column(s)`);
      }

      // update cells with column headers
      requests.push({
        updateCells: {
          rows: [
            {
              values: missingColumns.map((c) => ({
                userEnteredValue: { stringValue: c.name },
              })),
            },
          ],
          fields: "userEnteredValue",
          start: {
            sheetId,
            rowIndex: 0,
            columnIndex: columnCount - emptyEndColumns,
          },
        },
      });

      // reset basic filter
      requests.push({
        clearBasicFilter: {
          sheetId,
        },
      });
      requests.push({
        setBasicFilter: {
          filter: {
            range: {
              sheetId,
              startRowIndex: 0,
              startColumnIndex: 0,
            },
          },
        },
      });
    }
  }

  if (requests.length === 0) {
    console.log("No missing columns to add");
  } else {
    console.log("Adding missing columns...");

    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    console.log("  Done ✅");
  }
}

(async () => {
  switch (DATA_PROVIDER_NAME) {
    case "google-sheets":
      await applyGoogleSheetsSchema();
      break;

    default:
      console.error(`DATA_PROVIDER_NAME not supported: ${DATA_PROVIDER_NAME}`);
      break;
  }
})();
