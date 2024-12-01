import sinon from "sinon";
import { t, Test } from "tap";
import { testFile1 } from "../../utils/testing/data";

// test objects

const loadFilesStub = sinon.stub();
const getFileStreamStub = sinon.stub();
const logger = {
  info: sinon.stub(),
};

// helpers

function importModule(t: Test) {
  return t.mockRequire("./local", {
    "./files": { loadFiles: loadFilesStub, getFileStream: getFileStreamStub },
    "../../utils/logger": { logger },
  });
}

// tests

t.test("data/file-providers/local", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("LocalFileProvider", async (t) => {
    let LocalFileProvider: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      LocalFileProvider = result.LocalFileProvider;
    });

    t.test("instance methods", async (t) => {
      let provider: any;

      t.beforeEach(async () => {
        provider = new LocalFileProvider();
      });

      t.test("initialize", async (t) => {
        t.test("loads available files", async (t) => {
          try {
            await provider.initialize();
          } catch {}

          t.ok(loadFilesStub.called);
        });

        t.test("logs file info", async (t) => {
          const byUrl = {};
          loadFilesStub.resolves({ byUrl });

          await provider.initialize();

          t.ok(logger.info.called);
          t.equal(logger.info.firstCall.firstArg, byUrl);
        });

        t.test("ensures that initialization only happens once", async (t) => {
          loadFilesStub.resolves({ byUrl: {} });

          await provider.initialize();
          sinon.resetHistory();

          await provider.initialize();

          t.notOk(loadFilesStub.called);
          t.notOk(logger.info.called);
        });
      });

      t.test("getFileInfo", async (t) => {
        t.test("requires initialization", async (t) => {
          t.rejects(() => provider.getFileInfo("https://example.com/foo"), {
            message: "Provider not initialized",
          });
        });

        t.test("when initialized", async (t) => {
          const file = testFile1();

          t.beforeEach(async () => {
            loadFilesStub.resolves({
              byUrl: {
                "https://example.com/foo": file,
              },
            });

            await provider.initialize();
          });

          t.test("if file exists, returns copy", async (t) => {
            const result = await provider.getFileInfo(
              "https://example.com/foo",
            );

            t.ok(result);
            t.same(result, file);
          });

          t.test("if file doesn't exist, returns nothing", async (t) => {
            const result = await provider.getFileInfo(
              "https://example.com/bar",
            );

            t.equal(result, undefined);
          });
        });
      });

      t.test("sendFile", async (t) => {
        t.test("requires initialization", async (t) => {
          const destination = {};

          t.throws(
            () =>
              provider.sendFile(
                "https://example.com/foo",
                "application/msword",
                destination,
              ),
            {
              message: "Provider not initialized",
            },
          );
        });

        t.test("when initialized", async (t) => {
          const file = {
            title: "Example Doc",
          };
          const mediaType = {
            extension: "doc",
          };
          const destination = {
            attachment: sinon.stub(),
          };
          const mockFileStream = {
            on: sinon.stub(),
            pipe: sinon.stub(),
          };

          t.beforeEach(async () => {
            loadFilesStub.resolves({ byUrl: {} });
            await provider.initialize();
          });

          t.test("attaches the file name to the server response", async (t) => {
            try {
              provider.sendFile(file, mediaType, destination);
            } catch {}

            t.ok(destination.attachment.called);
            t.equal(
              destination.attachment.firstCall.firstArg,
              "Example Doc.doc",
            );
          });

          t.test("obtains a file stream", async (t) => {
            try {
              provider.sendFile(file, mediaType, destination);
            } catch {}

            t.ok(getFileStreamStub.called);
            t.equal(getFileStreamStub.firstCall.firstArg, "Example Doc.doc");
          });

          t.test("with the file stream", async (t) => {
            t.beforeEach(async () => {
              getFileStreamStub.returns(mockFileStream);
            });

            t.test("handles the 'error' event", async (t) => {
              try {
                provider.sendFile(file, mediaType, destination);
              } catch {}

              t.ok(mockFileStream.on.called);
              t.equal(mockFileStream.on.firstCall.args[0], "error");
              const handler = mockFileStream.on.firstCall.args[1];
              const error = new Error("BOOM!");
              t.throws(() => handler(error), error);
            });

            t.test(
              "pipes the file stream to the server response",
              async (t) => {
                try {
                  provider.sendFile(file, mediaType, destination);
                } catch {}

                t.ok(mockFileStream.pipe.called);
                t.equal(mockFileStream.pipe.firstCall.firstArg, destination);
              },
            );
          });
        });
      });
    });
  });
});
