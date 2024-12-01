import { t } from "tap";

import { fileIdFromUrl } from "./file";

t.test("utils/google/drive/file", async (t) => {
  t.test("fileIdFromUrl", async (t) => {
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
});
