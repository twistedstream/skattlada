import sinon from "sinon";
import { test } from "tap";
import { MediaType } from "../../../types/entity";

// test objects

const readdirStub = sinon.stub();
const uniqueStub = sinon.stub();
const createReadStreamStub = sinon.stub();
const resolveFileTypeStub = sinon.stub();
const fileTypeFromMediaTypeStub = sinon.stub();

// helpers

function importModule(test: Tap.Test) {
  return test.mock("./index", {
    "node:fs/promises": { readdir: readdirStub },
    "node:fs": { createReadStream: createReadStreamStub },
    "friendly-mimes": { resolveFileType: resolveFileTypeStub },
    "../../../utils/identifier": { unique: uniqueStub },
    "../../../utils/media-type": {
      fileTypeFromMediaType: fileTypeFromMediaTypeStub,
    },
  });
}

// tests

test("data/file-providers/local", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("loadFiles", async (t) => {
    let loadFiles: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      loadFiles = result.loadFiles;
    });

    t.test("reads files in the current directory", async (t) => {
      try {
        await loadFiles();
      } catch {}

      t.ok(readdirStub.called);
      t.equal(readdirStub.firstCall.firstArg, __dirname);
    });

    t.test("filters and transforms the files to expected output", async (t) => {
      readdirStub.resolves([
        // returned
        "file1.doc",
        // not returned because no known MIME type
        "file2.ts",
        // returned
        "file3.xls",
        // not returned because no supported media type
        "file4.sh",
        // returned
        "file.5.ppt",
        // not returned because no supported media type
        "file6",
      ]);

      // mime behavior
      resolveFileTypeStub.callsFake((fileExtension: string) => {
        switch (fileExtension) {
          case ".doc":
            return { mime: "application/msword", name: "Microsoft Word" };
          case ".xls":
            return {
              mime: "application/vnd.ms-excel",
              name: "Microsoft Excel",
            };
          case ".ppt":
            return {
              mime: "application/vnd.ms-powerpoint",
              name: "Microsoft PowerPoint",
            };
          case ".sh":
            return { mime: "application/x-sh", name: "Bourne shell script" };
          case "":
            return {
              mime: "application/pgp-encrypted",
              name: "Pretty Good Privacy",
            };
          default:
            throw new Error("Unsupported!");
        }
      });

      // file type behavior
      fileTypeFromMediaTypeStub.callsFake((mediaType: MediaType) => {
        switch (mediaType.name) {
          case "application/msword":
            return "document";
          case "application/vnd.ms-excel":
            return "spreadsheet";
          case "application/vnd.ms-powerpoint":
            return "presentation";
        }
      });

      uniqueStub.onFirstCall().returns("FILE_1");
      uniqueStub.onSecondCall().returns("FILE_2");
      uniqueStub.onThirdCall().returns("FILE_3");

      const result = await loadFiles();

      const file1 = {
        id: "FILE_1",
        title: "file1",
        type: "document",
        availableMediaTypes: [
          {
            name: "application/msword",
            description: "Microsoft Word",
            extension: "doc",
          },
        ],
      };

      const file3 = {
        id: "FILE_2",
        title: "file3",
        type: "spreadsheet",
        availableMediaTypes: [
          {
            name: "application/vnd.ms-excel",
            description: "Microsoft Excel",
            extension: "xls",
          },
        ],
      };

      const file5 = {
        id: "FILE_3",
        title: "file.5",
        type: "presentation",
        availableMediaTypes: [
          {
            name: "application/vnd.ms-powerpoint",
            description: "Microsoft PowerPoint",
            extension: "ppt",
          },
        ],
      };

      t.same(result, {
        all: [file1, file3, file5],
        byUrl: {
          "https://example.com/FILE_1": file1,
          "https://example.com/FILE_2": file3,
          "https://example.com/FILE_3": file5,
        },
      });
    });
  });

  t.test("getFileStream", async (t) => {
    let getFileStream: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      getFileStream = result.getFileStream;
    });

    t.test("creates a file read stream with the expected path", async (t) => {
      getFileStream("file.doc");

      t.ok(createReadStreamStub.called);
      t.equal(createReadStreamStub.firstCall.firstArg, `${__dirname}/file.doc`);
    });

    t.test("returns the file stream", async (t) => {
      const fileStream = {};
      createReadStreamStub.returns(fileStream);

      const result = getFileStream("file.doc");

      t.equal(result, fileStream);
    });
  });
});
