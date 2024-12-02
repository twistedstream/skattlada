import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const getFileStub = sinon.stub();

// helpers

function importModule(t: Test) {
  return t.mockRequire("./file", {
    "./client": {
      drive: {
        files: {
          get: getFileStub,
        },
      },
    },
  });
}

// tests

t.test("utils/google/drive/file", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fileIdFromUrl", async (t) => {
    const { fileIdFromUrl } = importModule(t);

    t.test("extracts file ID from given URLs", async (t) => {
      [
        {
          url: "https://docs.google.com/spreadsheets/d/SHEET1_ID/edit",
          id: "SHEET1_ID",
        },
        {
          url: "https://docs.google.com/spreadsheets/d/SHEET2_ID",
          id: "SHEET2_ID",
        },
        {
          url: "https://docs.google.com/spreadsheets/d/SHEET3_ID?foo=bar",
          id: "SHEET3_ID",
        },
        {
          url: "https://docs.google.com/spreadsheets/d/SHEET4_ID#foo=bar",
          id: "SHEET4_ID",
        },
        {
          url: "https://docs.google.com/document/d/DOC1_ID/edit",
          id: "DOC1_ID",
        },
        {
          url: "https://docs.google.com/document/d/DOC2_ID",
          id: "DOC2_ID",
        },
        {
          url: "https://docs.google.com/document/d/DOC3_ID?foo=bar",
          id: "DOC3_ID",
        },
        {
          url: "https://docs.google.com/document/d/DOC4_ID#foo=bar",
          id: "DOC4_ID",
        },
        {
          url: "https://docs.google.com/presentation/d/PRES1_ID/edit",
          id: "PRES1_ID",
        },
        {
          url: "https://docs.google.com/presentation/d/PRES2_ID/edit",
          id: "PRES2_ID",
        },
        {
          url: "https://drive.google.com/file/d/FILE1_ID/view",
          id: "FILE1_ID",
        },
        {
          url: "https://drive.google.com/file/d/FILE2_ID",
          id: "FILE2_ID",
        },
        {
          url: "https://drive.google.com/file/d/FILE3_ID?foo=bar",
          id: "FILE3_ID",
        },
        {
          url: "https://drive.google.com/file/d/FILE4_ID#foo=bar",
          id: "FILE4_ID",
        },
      ].forEach((pair) => {
        const { url, id } = pair;
        const result = fileIdFromUrl(url);

        t.equal(result, id, `${url} -> ${id}`);
      });
    });

    t.test("returns nothing if file ID cannot be extracted", async (t) => {
      const result = fileIdFromUrl("https://example.com/no-id");

      t.equal(result, undefined);
    });
  });

  t.test("getDriveFileInfo", async (t) => {
    const { getDriveFileInfo } = importModule(t);

    t.test("fetches the file metadata from Google Drive", async (t) => {
      try {
        await getDriveFileInfo("FILE_ID");
      } catch {}

      t.ok(getFileStub.called);
      t.same(getFileStub.firstCall.firstArg, {
        fileId: "FILE_ID",
        fields: "id,name,mimeType,exportLinks",
      });
    });

    t.test(
      "if Google Drives throws a 404 error, returns nothing",
      async (t) => {
        const error: any = new Error("Don't know that file");
        error.status = 404;
        getFileStub.rejects(error);

        const result = await getDriveFileInfo("FILE_ID");

        t.equal(result, undefined);
      },
    );

    t.test(
      "if Google Drives throws any other error, throws that error",
      async (t) => {
        const error: any = new Error("BOOM!");
        getFileStub.rejects(error);

        t.rejects(() => getDriveFileInfo("FILE_ID"), error);
      },
    );
  });
});
