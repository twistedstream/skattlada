import { StatusCodes } from "http-status-codes";
import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const logger = {
  info: sinon.stub(),
};
const getFileStub = sinon.stub();
const exportFileStub = sinon.stub();
const fileIdFromUrlStub = sinon.stub();
const getDriveFileInfoStub = sinon.stub();
const fileTypeFromMediaTypeStub = sinon.stub();
const mediaTypeFromMimeTypeStub = sinon.stub();

// helpers

function importModule(t: Test) {
  return t.mockRequire("./google-drive", {
    "../../utils/logger": { logger },
    "../../utils/google/drive/client": {
      drive: {
        files: {
          get: getFileStub,
          export: exportFileStub,
        },
      },
    },
    "../../utils/google/drive/file": {
      fileIdFromUrl: fileIdFromUrlStub,
      getDriveFileInfo: getDriveFileInfoStub,
    },
    "../../utils/media-type": {
      fileTypeFromMediaType: fileTypeFromMediaTypeStub,
      mediaTypeFromMimeType: mediaTypeFromMimeTypeStub,
    },
  });
}

// tests

t.test("data/file-providers/google-drive", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("GoogleDriveFileProvider", async (t) => {
    let GoogleDriveFileProvider: any;

    t.beforeEach(async () => {
      const result = importModule(t);
      GoogleDriveFileProvider = result.GoogleDriveFileProvider;
    });

    t.test("instance methods", async (t) => {
      let provider: any;

      t.beforeEach(async () => {
        provider = new GoogleDriveFileProvider();
      });

      t.test("initialize", async (t) => {
        t.test("logs that initialization was done", async (t) => {
          await provider.initialize();

          t.ok(logger.info.called);
        });

        t.test("ensures that initialization only happens once", async (t) => {
          await provider.initialize();
          sinon.resetHistory();

          await provider.initialize();

          t.notOk(logger.info.called);
        });
      });

      t.test("getFileInfo", async (t) => {
        t.test("requires initialization", async (t) => {
          t.rejects(() => provider.getFileInfo("https://example.com/FILE_ID"), {
            message: "Provider not initialized",
          });
        });

        t.test("when initialized", async (t) => {
          t.beforeEach(async () => {
            await provider.initialize();
          });

          t.test("obtains the file ID from the URL", async (t) => {
            try {
              await provider.getFileInfo("https://example.com/FILE_ID");
            } catch {}

            t.ok(fileIdFromUrlStub.called);
            t.equal(
              fileIdFromUrlStub.firstCall.firstArg,
              "https://example.com/FILE_ID",
            );
          });

          t.test("if no file ID is obtained, returns nothing", async (t) => {
            fileIdFromUrlStub.returns(undefined);

            const result = await provider.getFileInfo(
              "https://example.com/FILE_ID",
            );

            t.equal(result, undefined);
          });

          t.test("when a file ID is obtained", async (t) => {
            t.beforeEach(async () => {
              fileIdFromUrlStub.returns("FILE_ID");
            });

            t.test("fetches drive file metadata", async (t) => {
              try {
                await provider.getFileInfo("https://example.com/FILE_ID");
              } catch {}

              t.ok(getDriveFileInfoStub.called);
              t.equal(getDriveFileInfoStub.firstCall.firstArg, "FILE_ID");
            });

            t.test(
              "if no drive file metadata exists, return nothing",
              async (t) => {
                getDriveFileInfoStub.returns(undefined);

                const result = await provider.getFileInfo(
                  "https://example.com/FILE_ID",
                );

                t.equal(result, undefined);
              },
            );

            t.test("when drive file metadata exists", async (t) => {
              let info: any;

              t.beforeEach(async () => {
                info = {
                  id: "FILE_ID",
                  name: "Some file",
                  mimeType: "mime-type",
                };
                getDriveFileInfoStub.resolves(info);
              });

              t.test(
                "obtains the media type from the Google file MIME type",
                async (t) => {
                  try {
                    await provider.getFileInfo("https://example.com/FILE_ID");
                  } catch {}

                  t.ok(mediaTypeFromMimeTypeStub.called);
                  t.equal(
                    mediaTypeFromMimeTypeStub.firstCall.firstArg,
                    "mime-type",
                  );
                },
              );

              t.test(
                "if the MIME type is not recognized, throws expected error",
                async (t) => {
                  mediaTypeFromMimeTypeStub.returns(undefined);

                  t.rejects(
                    () => provider.getFileInfo("https://example.com/FILE_ID"),
                    {
                      message:
                        "Google Drive file (FILE_ID) has an unknown media type: mime-type",
                    },
                  );
                },
              );

              t.test("when the MIME type is recognized", async (t) => {
                const fileMediaType = {};

                t.beforeEach(async () => {
                  mediaTypeFromMimeTypeStub.onCall(0).returns(fileMediaType);
                });

                t.test("obtains a file type from the media type", async (t) => {
                  try {
                    await provider.getFileInfo("https://example.com/FILE_ID");
                  } catch {}

                  t.ok(fileTypeFromMediaTypeStub.called);
                  t.equal(
                    fileTypeFromMediaTypeStub.firstCall.firstArg,
                    fileMediaType,
                  );
                });

                t.test("with file type", async (t) => {
                  t.beforeEach(async () => {
                    fileTypeFromMediaTypeStub.returns("document");
                  });

                  t.test(
                    "returns a file info with expected id, title, and type",
                    async (t) => {
                      const result = await provider.getFileInfo(
                        "https://example.com/FILE_ID",
                      );

                      t.ok(result);
                      t.equal(result.id, "FILE_ID");
                      t.equal(result.title, "Some file");
                      t.equal(result.type, "document");
                    },
                  );

                  t.test("when the Google file has export links", async (t) => {
                    t.beforeEach(async () => {
                      info.exportLinks = {
                        "mime-type-1": "https://example.com/export-link-1",
                        "mime-type-2": "https://example.com/export-link-2",
                        "mime-type-3": "https://example.com/export-link-3",
                      };
                    });

                    t.test(
                      "obtains a media type for each export link MIME type",
                      async (t) => {
                        try {
                          await provider.getFileInfo(
                            "https://example.com/FILE_ID",
                          );
                        } catch {}

                        const calls = mediaTypeFromMimeTypeStub.getCalls();
                        t.equal(calls.length, 4);
                        t.equal(calls[1].firstArg, "mime-type-1");
                        t.equal(calls[2].firstArg, "mime-type-2");
                        t.equal(calls[3].firstArg, "mime-type-3");
                      },
                    );

                    t.test(
                      "returns a file info with expected available media types",
                      async (t) => {
                        const exportMediaType1 = {};
                        const exportMediaType2 = {};
                        const exportMediaType3 = {};
                        mediaTypeFromMimeTypeStub
                          .onCall(1)
                          .returns(exportMediaType1);
                        mediaTypeFromMimeTypeStub
                          .onCall(2)
                          .returns(exportMediaType2);
                        mediaTypeFromMimeTypeStub
                          .onCall(3)
                          .returns(exportMediaType3);

                        const result = await provider.getFileInfo(
                          "https://example.com/FILE_ID",
                        );

                        t.ok(result.availableMediaTypes);
                        t.equal(result.availableMediaTypes.length, 3);
                        t.equal(
                          result.availableMediaTypes[0],
                          exportMediaType1,
                        );
                        t.equal(
                          result.availableMediaTypes[1],
                          exportMediaType2,
                        );
                        t.equal(
                          result.availableMediaTypes[2],
                          exportMediaType3,
                        );
                      },
                    );
                  });

                  t.test(
                    "if the Google file has no export links, returns a file info the Google file's own media type",
                    async (t) => {
                      const result = await provider.getFileInfo(
                        "https://example.com/FILE_ID",
                      );

                      t.ok(result.availableMediaTypes);
                      t.equal(result.availableMediaTypes.length, 1);
                      t.equal(result.availableMediaTypes[0], fileMediaType);
                    },
                  );
                });
              });
            });
          });
        });
      });

      t.test("sendFile", async (t) => {
        t.test("requires initialization", async (t) => {
          t.rejects(() => provider.sendFile({}, {}, {}), {
            message: "Provider not initialized",
          });
        });

        t.test("when initialized", async (t) => {
          const file = {
            id: "FILE_ID",
            title: "Example Doc",
          };
          const mediaType = {
            name: "mime-type",
            extension: "doc",
          };
          const destination = {
            attachment: sinon.stub(),
          };
          const mockGoogleDriveStream = {
            on: sinon.stub(),
            pipe: sinon.stub(),
          };

          t.beforeEach(async () => {
            await provider.initialize();
          });

          t.test("fetches drive file metadata", async (t) => {
            try {
              await provider.sendFile(file, mediaType, destination);
            } catch {}

            t.ok(getDriveFileInfoStub.called);
            t.equal(getDriveFileInfoStub.firstCall.firstArg, "FILE_ID");
          });

          t.test(
            "if no drive file metadata is obtained, throws expected exception",
            async (t) => {
              getDriveFileInfoStub.returns(undefined);

              t.rejects(
                provider.sendFile(file, mediaType, destination),
                "Not found",
                {
                  statusCode: StatusCodes.NOT_FOUND,
                },
              );
            },
          );

          t.test("when drive file metadata exists", async (t) => {
            let info: any;

            t.beforeEach(async () => {
              info = {
                id: "FILE_ID",
                name: "Some file",
                mimeType: "mime-type",
              };
              getDriveFileInfoStub.resolves(info);
            });

            function commonOutputStreamTests(t: Test) {
              t.test("handles the 'error' event", async (t) => {
                try {
                  await provider.sendFile(file, mediaType, destination);
                } catch {}

                t.ok(mockGoogleDriveStream.on.called);
                t.equal(mockGoogleDriveStream.on.firstCall.args[0], "error");
                const handler = mockGoogleDriveStream.on.firstCall.args[1];
                const error = new Error("BOOM!");
                t.throws(() => handler(error), error);
              });

              t.test(
                "pipes the file stream to the server response",
                async (t) => {
                  try {
                    await provider.sendFile(file, mediaType, destination);
                  } catch {}

                  t.ok(mockGoogleDriveStream.pipe.called);
                  t.equal(
                    mockGoogleDriveStream.pipe.firstCall.firstArg,
                    destination,
                  );
                },
              );
            }

            t.test("when the file is exportable", async (t) => {
              t.beforeEach(async () => {
                info.exportLinks = {
                  "mime-type-1": "https://example.com/export-link-1",
                  "mime-type-2": "https://example.com/export-link-2",
                  "mime-type-3": "https://example.com/export-link-3",
                };
              });

              t.test(
                "attaches the expected file name to the server response",
                async (t) => {
                  try {
                    await provider.sendFile(file, mediaType, destination);
                  } catch {}

                  t.ok(destination.attachment.called);
                  t.equal(
                    destination.attachment.firstCall.firstArg,
                    "Example Doc.doc",
                  );
                },
              );

              t.test("exports the file from Google Drive", async (t) => {
                try {
                  await provider.sendFile(file, mediaType, destination);
                } catch {}

                t.ok(exportFileStub.called);
                t.same(exportFileStub.firstCall.args[0], {
                  fileId: "FILE_ID",
                  mimeType: "mime-type",
                });
                t.same(exportFileStub.firstCall.args[1], {
                  responseType: "stream",
                });
              });

              t.test("with the resulting stream", async (t) => {
                t.beforeEach(async () => {
                  exportFileStub.resolves({ data: mockGoogleDriveStream });
                });

                commonOutputStreamTests(t);
              });
            });

            t.test("when the file is not exportable", async (t) => {
              t.test(
                "attaches the expected file name to the server response",
                async (t) => {
                  try {
                    await provider.sendFile(file, mediaType, destination);
                  } catch {}

                  t.ok(destination.attachment.called);
                  t.equal(
                    destination.attachment.firstCall.firstArg,
                    // no file extension since the file title should include an extension
                    "Example Doc",
                  );
                },
              );

              t.test("downloads the file from Google Drive", async (t) => {
                try {
                  await provider.sendFile(file, mediaType, destination);
                } catch {}

                t.ok(getFileStub.called);
                t.same(getFileStub.firstCall.args[0], {
                  fileId: "FILE_ID",
                  alt: "media",
                });
                t.same(getFileStub.firstCall.args[1], {
                  responseType: "stream",
                });
              });

              t.test("with the resulting stream", async (t) => {
                t.beforeEach(async () => {
                  getFileStub.resolves({ data: mockGoogleDriveStream });
                });

                commonOutputStreamTests(t);
              });
            });
          });
        });
      });
    });
  });
});
