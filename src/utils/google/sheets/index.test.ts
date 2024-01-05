import { cloneDeep, omit } from "lodash";
import sinon from "sinon";
import { test } from "tap";
import { Row } from "../../../types/table";
import { waitForNextLoop } from "../../testing/unit";

// test objects
const getValuesStub = sinon.stub();
const appendValuesStub = sinon.stub();
const updateValuesStub = sinon.stub();
const getSpreadsheetStub = sinon.stub();
const batchUpdateSpreadsheetStub = sinon.stub();
const processUpdatedDataStub = sinon.stub();
const rowToValuesStub = sinon.stub();
const valuesToRowStub = sinon.stub();
const enforceConstraintsStub = sinon.stub();
const openTableStub = sinon.stub();

const row1: Row = { username: "jim", age: 42, _rowNumber: 2 };
const row2: Row = { username: "bob", age: 24, _rowNumber: 3 };
const row3: Row = { username: "mary", age: 32, _rowNumber: 4 };

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "../../../utils/config": {
      googleSpreadsheetId: "spreadsheet-id",
    },
    "./client": {
      sheets: {
        spreadsheets: {
          values: {
            get: getValuesStub,
            append: appendValuesStub,
            update: updateValuesStub,
          },
          get: getSpreadsheetStub,
          batchUpdate: batchUpdateSpreadsheetStub,
        },
      },
    },
    "./row": {
      processUpdatedData: processUpdatedDataStub,
      rowToValues: rowToValuesStub,
      valuesToRow: valuesToRowStub,
    },
    "./table": {
      enforceConstraints: enforceConstraintsStub,
      openTable: openTableStub,
    },
  });
}

test("utils/google/sheets/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("countRows", async (t) => {
    const values = [
      ["first_name", "last_name", "age"],
      ["Bob", "Smith", 42],
      ["Jim", "Johnson", 24],
    ];

    const { countRows } = importModule(t);

    t.test("when no data exists, returns zero", async (t) => {
      getValuesStub.resolves({ data: { values: undefined } });

      const result = await countRows("bananas");

      t.equal(result, 0);
    });

    t.test("when data exists, returns expected count", async (t) => {
      getValuesStub.resolves({ data: { values: cloneDeep(values) } });

      const result = await countRows("bananas");

      t.equal(result, 2);
    });
  });

  t.test("findRows", async (t) => {
    const { findRows } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await findRows("bananas", () => true);
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("returns expected table rows", async (t) => {
      openTableStub.resolves({ rows: [row1, row2, row3] });

      const result = await findRows("bananas", (r: any) => r.age > 30);

      t.ok(result.rows);
      t.equal(result.rows.length, 2);
      t.equal(result.rows[0], row1);
      t.equal(result.rows[1], row3);
    });
  });

  t.test("findRow", async (t) => {
    const { findRow } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await findRow("bananas", () => true);
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("returns expected table row", async (t) => {
      openTableStub.resolves({ rows: [row1, row2, row3] });

      const result = await findRow("bananas", (r: any) => r.age > 30);

      t.ok(result.row);
      t.equal(result.row, row1);
    });
  });

  t.test("findKeyRows", async (t) => {
    const { findKeyRows } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await findKeyRows("bananas", () => true, []);
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("returns expected rows by key", async (t) => {
      openTableStub.returns({ rows: [row1, row2, row3] });

      const result = await findKeyRows("bananas", (r: any) => r.username, [
        "jim",
        "mary",
      ]);

      t.ok(result);
      t.same(Object.keys(result.rowsByKey), ["jim", "mary"]);
      t.equal(result.rowsByKey["jim"], row1);
      t.equal(result.rowsByKey["mary"], row3);
    });
  });

  t.test("insertRow", async (t) => {
    const { insertRow } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await insertRow("bananas", {}, {});
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("enforces column constraints", async (t) => {
      const rows: any = [];
      openTableStub.resolves({ rows });
      const newRow = {};
      const constraints = {};

      try {
        await insertRow("bananas", newRow, constraints);
      } catch {}

      t.ok(enforceConstraintsStub.called);
      t.equal(enforceConstraintsStub.firstCall.args[0], rows);
      t.equal(enforceConstraintsStub.firstCall.args[1], newRow);
      t.equal(enforceConstraintsStub.firstCall.args[2], constraints);
    });

    t.test("converts the new row object to Google Sheets values", async (t) => {
      const columns: any = [];
      openTableStub.resolves({ columns });
      const newRow = {};

      try {
        await insertRow("bananas", newRow, {});
      } catch {}

      t.ok(rowToValuesStub.called);
      t.equal(rowToValuesStub.firstCall.args[0], newRow);
      t.equal(rowToValuesStub.firstCall.args[1], columns);
    });

    t.test("appends the new row in Google Sheets", async (t) => {
      const columns: any = [];
      openTableStub.resolves({ columns });
      const rowValues: any = [];
      rowToValuesStub.returns(rowValues);

      try {
        await insertRow("bananas", {}, {});
      } catch {}

      t.ok(appendValuesStub.called);
      const options = appendValuesStub.firstCall.firstArg;
      t.same(omit(options, "requestBody"), {
        spreadsheetId: "spreadsheet-id",
        range: "bananas",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        includeValuesInResponse: true,
        responseValueRenderOption: "UNFORMATTED_VALUE",
        responseDateTimeRenderOption: "SERIAL_NUMBER",
      });
      const values = options?.requestBody?.values;
      t.ok(values);
      t.equal(values.length, 1);
      t.equal(values[0], rowValues);
    });

    t.test(
      "processes the updated data returned from Google Sheets",
      async (t) => {
        const columns: any = [];
        openTableStub.resolves({ columns });
        const rowValues: any = [];
        rowToValuesStub.returns(rowValues);
        const updatedData = {};
        appendValuesStub.resolves({ data: { updates: { updatedData } } });

        try {
          await insertRow("bananas", {}, {});
        } catch {}

        t.ok(processUpdatedDataStub.called);
        t.equal(processUpdatedDataStub.firstCall.args[0], updatedData);
        t.equal(processUpdatedDataStub.firstCall.args[1], "bananas");
        t.equal(processUpdatedDataStub.firstCall.args[2], rowValues);
      }
    );

    t.test(
      "converts the returned new row data back into a row object",
      async (t) => {
        const columns: any = [];
        openTableStub.resolves({ columns });
        const rowValues: any = [];
        rowToValuesStub.returns(rowValues);
        const updatedData = {};
        appendValuesStub.resolves({ data: { updates: { updatedData } } });
        const updatedRowValues: any = [];
        const updatedRowNumber = 7;
        processUpdatedDataStub.returns({ updatedRowValues, updatedRowNumber });

        try {
          await insertRow("bananas", {}, {});
        } catch {}

        t.ok(valuesToRowStub.called);
        t.equal(valuesToRowStub.firstCall.args[0], updatedRowValues);
        t.equal(valuesToRowStub.firstCall.args[1], columns);
        t.equal(valuesToRowStub.firstCall.args[2], updatedRowNumber);
      }
    );

    t.test("returns the inserted row", async (t) => {
      const columns: any = [];
      openTableStub.resolves({ columns });
      const rowValues: any = [];
      rowToValuesStub.returns(rowValues);
      const updatedData = {};
      appendValuesStub.resolves({ data: { updates: { updatedData } } });
      const updatedRowValues: any = [];
      const updatedRowNumber = 7;
      processUpdatedDataStub.returns({ updatedRowValues, updatedRowNumber });
      const insertedRow = {};
      valuesToRowStub.returns(insertedRow);

      const result = await insertRow("bananas", {}, {});

      t.ok(result);
      t.equal(result.insertedRow, insertedRow);
    });

    // TODO: test atomic behavior:
    // - attempt a second create (with same column constraint value) before first promise resolves
    // - make sure second create results in a column constraint error
  });

  t.test("updateRow", async (t) => {
    const { updateRow } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await updateRow("bananas", () => true, {}, {});
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("finds the row to update", async (t) => {
      const rows = { find: sinon.stub() };
      openTableStub.resolves({ rows });
      const predicate = () => true;

      try {
        await updateRow("bananas", predicate, {}, {});
      } catch {}

      t.ok(rows.find.called);
      t.equal(rows.find.firstCall.firstArg, predicate);
    });

    t.test("if row isn't found, throws expected error", async (t) => {
      const rows = { find: sinon.fake.returns(undefined) };
      openTableStub.resolves({ rows });

      t.rejects(() => updateRow("bananas", () => true, {}, {}), {
        message: "Row not found",
      });
    });

    t.test("when row exists", async (t) => {
      let existingRow: any;
      let rows: any;
      const columns: any = [];

      t.beforeEach(async () => {
        existingRow = {};
        rows = { find: sinon.fake.returns(existingRow) };
        openTableStub.resolves({ columns, rows });
      });

      t.test("enforces column constraints", async (t) => {
        const constraints = {};

        try {
          await updateRow("bananas", () => true, {}, constraints);
        } catch {}

        t.ok(enforceConstraintsStub.called);
        t.equal(enforceConstraintsStub.firstCall.args[0], rows);
        t.equal(enforceConstraintsStub.firstCall.args[1], existingRow);
        t.equal(enforceConstraintsStub.firstCall.args[2], constraints);
      });

      t.test(
        "the existing row has been updated and converted to Google Sheets values",
        async (t) => {
          const rowUpdates = { foo: "bar", baz: 42 };

          try {
            await updateRow("bananas", () => true, rowUpdates, {});
          } catch {}

          t.same(existingRow, rowUpdates);
          t.ok(rowToValuesStub.called);
          t.equal(rowToValuesStub.firstCall.args[0], existingRow);
          t.equal(rowToValuesStub.firstCall.args[1], columns);
        }
      );

      t.test("updates the row in Google Sheets", async (t) => {
        const rowValues: any = [];
        rowToValuesStub.returns(rowValues);
        existingRow._rowNumber = 7;

        try {
          await updateRow("bananas", () => true, {}, {});
        } catch {}

        t.ok(updateValuesStub.called);
        const options = updateValuesStub.firstCall.firstArg;
        t.same(omit(options, "requestBody"), {
          spreadsheetId: "spreadsheet-id",
          range: "bananas!7:7",
          valueInputOption: "RAW",
          includeValuesInResponse: true,
          responseValueRenderOption: "UNFORMATTED_VALUE",
          responseDateTimeRenderOption: "SERIAL_NUMBER",
        });
        const values = options?.requestBody?.values;
        t.ok(values);
        t.equal(values.length, 1);
        t.equal(values[0], rowValues);
      });

      t.test(
        "processes the updated data returned from Google Sheets",
        async (t) => {
          const rowValues: any = [];
          rowToValuesStub.returns(rowValues);
          const updatedData = {};
          updateValuesStub.resolves({ data: { updatedData } });

          try {
            await updateRow("bananas", () => true, {}, {});
          } catch {}

          t.ok(processUpdatedDataStub.called);
          t.equal(processUpdatedDataStub.firstCall.args[0], updatedData);
          t.equal(processUpdatedDataStub.firstCall.args[1], "bananas");
          t.equal(processUpdatedDataStub.firstCall.args[2], rowValues);
        }
      );

      t.test(
        "converts the returned new row data back into a row object",
        async (t) => {
          const updatedData = {};
          updateValuesStub.resolves({ data: { updatedData } });
          const updatedRowValues: any = [];
          const updatedRowNumber = 7;
          processUpdatedDataStub.returns({
            updatedRowValues,
            updatedRowNumber,
          });

          try {
            await updateRow("bananas", () => true, {}, {});
          } catch {}

          t.ok(valuesToRowStub.called);
          t.equal(valuesToRowStub.firstCall.args[0], updatedRowValues);
          t.equal(valuesToRowStub.firstCall.args[1], columns);
          t.equal(valuesToRowStub.firstCall.args[2], updatedRowNumber);
        }
      );

      t.test("returns the updated row", async (t) => {
        const updatedData = {};
        updateValuesStub.resolves({ data: { updatedData } });
        const updatedRowValues: any = [];
        const updatedRowNumber = 7;
        processUpdatedDataStub.returns({
          updatedRowValues,
          updatedRowNumber,
        });
        const updatedRow = {};
        valuesToRowStub.returns(updatedRow);

        const result = await updateRow("bananas", () => true, {}, {});

        t.ok(result);
        t.equal(result.updatedRow, updatedRow);
      });
    });

    // TODO: test atomic behavior
    // - first promise: create with a column constraint value before
    // - second promise: attempt an update on an existing row with the same column constraint value
    // - make sure second create results in a column constraint error
  });

  t.test("deleteRow", async (t) => {
    const { deleteRow } = importModule(t);

    t.test("opens a table", async (t) => {
      try {
        await deleteRow("bananas", () => true);
      } catch {}

      t.ok(openTableStub.called);
      t.equal(openTableStub.firstCall.firstArg, "bananas");
    });

    t.test("finds the row to delete", async (t) => {
      const rows = { find: sinon.stub() };
      openTableStub.resolves({ rows });
      const predicate = () => true;

      try {
        await deleteRow("bananas", predicate);
      } catch {}

      t.ok(rows.find.called);
      t.equal(rows.find.firstCall.firstArg, predicate);
    });

    t.test("if row isn't found, throws expected error", async (t) => {
      const rows = { find: sinon.fake.returns(undefined) };
      openTableStub.resolves({ rows });

      t.rejects(() => deleteRow("bananas", () => true), {
        message: "Row not found",
      });
    });

    t.test("when row exists", async (t) => {
      const existingRow = { _rowNumber: 7 };
      let rows: any;

      t.beforeEach(async () => {
        rows = { find: sinon.fake.returns(existingRow) };
        openTableStub.resolves({ rows });
      });

      t.test("gets the spreadsheet object from Google Sheets", async (t) => {
        try {
          await deleteRow("bananas", () => true);
        } catch {}

        t.ok(getSpreadsheetStub.called);
        t.same(getSpreadsheetStub.firstCall.firstArg, {
          spreadsheetId: "spreadsheet-id",
        });
      });

      t.test(
        "if the corresponding sheet isn't found within the spreadsheet, throws expected error",
        async (t) => {
          getSpreadsheetStub.resolves({ data: { sheets: [] } });

          t.rejects(() => deleteRow("bananas", () => true), {
            message: "Sheet with name 'bananas' not found",
          });
        }
      );

      t.test(
        "when the sheet exists, deletes the row in Google Sheets",
        async (t) => {
          const sheet = { properties: { title: "bananas", index: "sheet-id" } };
          getSpreadsheetStub.resolves({ data: { sheets: [sheet] } });

          await deleteRow("bananas", () => true);

          t.ok(batchUpdateSpreadsheetStub.called);
          t.same(batchUpdateSpreadsheetStub.firstCall.firstArg, {
            spreadsheetId: "spreadsheet-id",
            requestBody: {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: "sheet-id",
                      dimension: "ROWS",
                      startIndex: 6,
                      endIndex: 7,
                    },
                  },
                },
              ],
            },
          });
        }
      );
    });
  });

  t.test("atomic behavior", async (t) => {
    const doNothing = () => undefined;

    t.test("read-only functions don't serialize", async (t) => {
      const { countRows, findRows, findRow, findKeyRows } = importModule(t);

      // force previous calls to happen after latter calls
      getValuesStub.onFirstCall().callsFake(async () => {
        await waitForNextLoop();
        await waitForNextLoop();
        await waitForNextLoop();
      });
      openTableStub.onCall(0).callsFake(async () => {
        await waitForNextLoop();
        await waitForNextLoop();
      });
      openTableStub.onCall(1).callsFake(async () => {
        await waitForNextLoop();
      });
      openTableStub.onCall(2).resolves();

      const calls: any = [];
      await Promise.all([
        countRows()
          .catch(doNothing)
          .then(() => calls.push("first")),
        findRows()
          .catch(doNothing)
          .then(() => calls.push("second")),
        findRow()
          .catch(doNothing)
          .then(() => calls.push("third")),
        findKeyRows()
          .catch(doNothing)
          .then(() => calls.push("fourth")),
      ]);

      t.same(calls, ["fourth", "third", "second", "first"]);
    });

    t.test("write functions do serialize", async (t) => {
      const { insertRow, updateRow, deleteRow } = importModule(t);

      // force previous calls to happen after latter calls
      openTableStub.onCall(0).callsFake(async () => {
        await waitForNextLoop();
        await waitForNextLoop();
      });
      openTableStub.onCall(1).callsFake(async () => {
        await waitForNextLoop();
      });
      openTableStub.onCall(2).resolves();

      const calls: any = [];
      await Promise.all([
        insertRow()
          .catch(doNothing)
          .then(() => calls.push("first")),
        updateRow()
          .catch(doNothing)
          .then(() => calls.push("second")),
        deleteRow()
          .catch(doNothing)
          .then(() => calls.push("third")),
      ]);

      t.same(calls, ["first", "second", "third"]);
    });
  });
});
