import { Mutex } from "async-mutex";

import {
  ColumnConstraints,
  KeyColumnSelector,
  Row,
  RowData,
  SearchPredicate,
} from "../../../types/table";
import { googleSpreadsheetId as spreadsheetId } from "../../../utils/config";
import { assertValue } from "../../../utils/error";
import { sheets } from "./client";
import { processUpdatedData, rowToValues, valuesToRow } from "./row";
import { enforceConstraints, openTable } from "./table";

const commonGoogleSheetsParams = {
  spreadsheetId,
  valueInputOption: "RAW",
  includeValuesInResponse: true,
  responseValueRenderOption: "UNFORMATTED_VALUE",
  responseDateTimeRenderOption: "SERIAL_NUMBER",
};

const mutex = new Mutex();

export async function countRows(sheetName: string): Promise<number> {
  const range = `${sheetName}!A:A`;

  const getResult = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const { values } = getResult.data;

  return values
    ? // don't include header row
      values.length - 1
    : // zero rows when no data
      0;
}

export async function findRows(
  sheetName: string,
  predicate: SearchPredicate
): Promise<{ rows: Row[] }> {
  const { rows } = await openTable(sheetName);
  const foundRows = rows.filter(predicate);

  return { rows: foundRows };
}

export async function findRow(
  sheetName: string,
  predicate: SearchPredicate
): Promise<{ row?: Row }> {
  const { rows } = await openTable(sheetName);
  const row = rows.find(predicate);

  return { row };
}

export async function findKeyRows<T extends keyof any>(
  sheetName: string,
  selector: KeyColumnSelector<T>,
  keys: T[]
): Promise<{ rowsByKey: Record<T, Row> }> {
  // get distinct list of keys
  const distinctKeys = Array.from(new Set(keys));

  // find all rows with those keys
  const rows = (await openTable(sheetName)).rows.filter((r) =>
    distinctKeys.includes(selector(r))
  );

  // return dictionary, mapping keys to Rows
  const rowsByValue = rows.reduce((p, c) => {
    p[selector(c)] = c;
    return p;
  }, <Record<T, Row>>{});

  return { rowsByKey: rowsByValue };
}

export async function insertRow(
  sheetName: string,
  newRow: RowData,
  constraints: ColumnConstraints = {}
): Promise<{ insertedRow: Row }> {
  return mutex.runExclusive(async () => {
    const { columns, rows } = await openTable(sheetName);

    // enforce constraint before insert
    enforceConstraints(rows, newRow, constraints);

    // append row
    const rowValues = rowToValues(newRow, columns);
    const appendResult = await sheets.spreadsheets.values.append({
      ...commonGoogleSheetsParams,
      insertDataOption: "INSERT_ROWS",
      range: sheetName,
      requestBody: {
        values: [rowValues],
      },
    });

    // process and return inserted row
    const { updatedRowValues, updatedRowNumber } = processUpdatedData(
      assertValue(assertValue(appendResult.data.updates).updatedData),
      sheetName,
      rowValues
    );
    const insertedRow = valuesToRow(
      updatedRowValues,
      columns,
      updatedRowNumber
    );
    return { insertedRow };
  });
}

export async function updateRow(
  sheetName: string,
  predicate: SearchPredicate,
  rowUpdates: RowData,
  constraints: ColumnConstraints = {}
): Promise<{ updatedRow: Row }> {
  return mutex.runExclusive(async () => {
    const { columns, rows } = await openTable(sheetName);

    // find existing row
    const existingRow = rows.find(predicate);
    if (!existingRow) {
      throw new Error("Row not found");
    }

    // update row values
    for (const key in rowUpdates) {
      existingRow[key] = rowUpdates[key];
    }

    // enforce constraints before update
    enforceConstraints(rows, existingRow, constraints);

    // update row
    const rowValues = rowToValues(existingRow, columns);
    const updateResult = await sheets.spreadsheets.values.update({
      ...commonGoogleSheetsParams,
      range: `${sheetName}!${existingRow._rowNumber}:${existingRow._rowNumber}`,
      requestBody: {
        values: [rowValues],
      },
    });

    // process and return updated row
    const { updatedRowValues, updatedRowNumber } = processUpdatedData(
      assertValue(updateResult.data.updatedData),
      sheetName,
      rowValues
    );
    const updatedRow = valuesToRow(updatedRowValues, columns, updatedRowNumber);
    return { updatedRow };
  });
}

export async function deleteRow(
  sheetName: string,
  predicate: SearchPredicate
): Promise<void> {
  return mutex.runExclusive(async () => {
    const { rows } = await openTable(sheetName);

    // find existing row
    const existingRow = rows.find(predicate);
    if (!existingRow) {
      throw new Error("Row not found");
    }

    // get sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = assertValue(spreadsheet.data.sheets).find(
      (sheet) => assertValue(sheet.properties).title === sheetName
    );
    if (!sheet) {
      throw new Error(`Sheet with name '${sheetName}' not found`);
    }
    const sheetId = assertValue(sheet.properties).index;

    // delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: existingRow._rowNumber - 1,
                endIndex: existingRow._rowNumber,
              },
            },
          },
        ],
      },
    });
  });
}
