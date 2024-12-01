import { DateTime, Duration } from "luxon";
import sinon from "sinon";
import { t, Test } from "tap";

import { StatusCodes } from "http-status-codes";
import { assertValue } from "../utils/error";

// test objects

const logger = {
  info: sinon.fake(),
  warn: sinon.fake(),
};
const fetchShareByIdStub = sinon.stub();
const nowStub = sinon.stub();

const getFileInfoStub = sinon.stub();
const sendFileStub = sinon.stub();
const fileProvider = {
  getFileInfo: getFileInfoStub,
  sendFile: sendFileStub,
};

// helpers

function importModule(t: Test) {
  return t.mockRequire("./share", {
    "../utils/logger": { logger },
    "../services/share": { fetchShareById: fetchShareByIdStub },
    "./time": { now: nowStub },
    "../data": {
      getFileProvider: () => fileProvider,
    },
  });
}

// tests

t.test("utils/share", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("buildExpirations", async (t) => {
    let buildExpirations: any;

    function allExpirations() {
      return [
        { value: "PT5M", description: "5 minutes", selected: false },
        { value: "PT30M", description: "30 minutes", selected: false },
        { value: "PT1H", description: "1 hour", selected: false },
        { value: "PT12H", description: "12 hours", selected: false },
        { value: "P1D", description: "1 day", selected: false },
        { value: "P3D", description: "3 days", selected: false },
        { value: "P1W", description: "1 week", selected: false },
        { value: "P2W", description: "2 weeks", selected: false },
        { value: "P1M", description: "1 month", selected: false },
        { value: "P3M", description: "3 months", selected: false },
        { value: "P6M", description: "6 months", selected: false },
        { value: "P1Y", description: "1 year", selected: false },
      ];
    }

    t.beforeEach(async () => {
      buildExpirations = importModule(t).buildExpirations;
    });

    t.test(
      "if no current duration is specified, returns expected expirations",
      async (t) => {
        const result = buildExpirations();

        t.ok(result);
        t.same(result, allExpirations());
      },
    );

    t.test(
      "if a current duration is specified, returns expected expirations",
      async (t) => {
        const current = "P1D";
        const result = buildExpirations(Duration.fromISO(current));

        const expected = allExpirations();
        assertValue(expected.find((e) => e.value === current)).selected = true;

        t.ok(result);
        t.same(result, expected);
      },
    );
  });

  t.test("getFileTypeStyle", async (t) => {
    let getFileTypeStyle: any;

    t.beforeEach(async () => {
      getFileTypeStyle = importModule(t).getFileTypeStyle;
    });

    t.test("if document, returns expected style", async (t) => {
      const result = getFileTypeStyle("document");

      t.equal(result, "primary");
    });

    t.test("if spreadsheet, returns expected style", async (t) => {
      const result = getFileTypeStyle("spreadsheet");

      t.equal(result, "success");
    });

    t.test("if presentation, returns expected style", async (t) => {
      const result = getFileTypeStyle("presentation");

      t.equal(result, "warning");
    });

    t.test("if pdf, returns expected style", async (t) => {
      const result = getFileTypeStyle("pdf");

      t.equal(result, "danger");
    });

    t.test("if image, returns expected style", async (t) => {
      const result = getFileTypeStyle("image");

      t.equal(result, "info");
    });

    t.test("if video, returns expected style", async (t) => {
      const result = getFileTypeStyle("video");

      t.equal(result, "secondary");
    });
  });

  t.test("ensureShare", async (t) => {
    let ensureShare: any;

    t.beforeEach(async () => {
      ensureShare = importModule(t).ensureShare;
    });

    t.test("if share ID is missing, throws expected error", async (t) => {
      const req = { params: {} };

      t.rejects(() => ensureShare(req), {
        message: "Missing: share ID",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    t.test("looks up the share", async (t) => {
      const req = { params: { share_id: "share-id" } };
      fetchShareByIdStub.resolves({});

      try {
        await ensureShare(req);
      } catch {}

      t.ok(fetchShareByIdStub.called);
      t.equal(fetchShareByIdStub.firstCall.firstArg, "share-id");
    });

    t.test("if share doesn't exist, throws expected error", async (t) => {
      const req = { params: { share_id: "no-exist" } };
      fetchShareByIdStub.resolves();

      t.rejects(() => ensureShare(req), {
        message: "Not Found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    t.test("if existing share", async (t) => {
      let share: any;

      t.beforeEach(() => {
        share = {
          id: "share-id",
          created: DateTime.fromObject({ year: 2023, month: 1, day: 1 }),
          createdBy: { id: "admin_user" },
          expireDuration: Duration.fromObject({ days: 2 }),
        };
        fetchShareByIdStub.resolves(share);
      });

      t.test("if share has expired", async (t) => {
        let req: any;

        t.beforeEach(async () => {
          req = { params: { share_id: "share-id" } };
          nowStub.returns(
            share.created.plus(
              // now = after share expiration
              Duration.fromObject({ days: 3 }),
            ),
          );
        });

        t.test("logs the expected warning", async (t) => {
          try {
            await ensureShare(req);
          } catch {}

          t.ok(logger.warn.called);
          t.equal(logger.warn.firstCall.args[0], share);
          t.equal(logger.warn.firstCall.args[1], "Share has expired");
        });

        t.test(
          "if share was claimed by current user, throws expected informative error",
          async (t) => {
            share.claimedBy = { id: "user-id" };
            req.user = { id: "user-id" };

            t.rejects(() => ensureShare(req), {
              message: "This share has expired",
              statusCode: StatusCodes.FORBIDDEN,
            });
          },
        );

        t.test(
          "if share was claimed but there is no current user, throws expected more generic error",
          async (t) => {
            share.claimedBy = { id: "user-id" };

            t.rejects(() => ensureShare(req), {
              message: "Not Found",
              statusCode: StatusCodes.NOT_FOUND,
            });
          },
        );

        t.test("otherwise, throws expected more generic error", async (t) => {
          t.rejects(() => ensureShare(req), {
            message: "Not Found",
            statusCode: StatusCodes.NOT_FOUND,
          });
        });
      });

      t.test("if user", async (t) => {
        let req: any;

        t.beforeEach(() => {
          req = {
            params: { share_id: "share-id" },
            user: { id: "user-id", username: "user" },
          };
        });

        t.test("if share has been claimed by a different user", async (t) => {
          t.beforeEach(() => {
            share.claimedBy = { id: "other-user-id", username: "other_user" };
          });

          t.test("logs the expected warning", async (t) => {
            try {
              await ensureShare(req);
            } catch {}

            t.ok(logger.warn.called);
            t.equal(logger.warn.firstCall.args[0], share);
            t.equal(
              logger.warn.firstCall.args[1],
              "Share was already claimed by a different user",
            );
          });

          t.test(
            "if share was created by current user, throws expected informative error",
            async (t) => {
              share.createdBy.id = "user-id";

              t.rejects(() => ensureShare(req), {
                message: "This share was already claimed by @other_user",
                statusCode: StatusCodes.FORBIDDEN,
              });
            },
          );

          t.test("otherwise, throws expected more generic error", async (t) => {
            t.rejects(() => ensureShare(req), {
              message: "Not Found",
              statusCode: StatusCodes.NOT_FOUND,
            });
          });
        });

        t.test(
          "if share has been claimed by the same user, returns expected share",
          async (t) => {
            share.claimedBy = { id: "user-id" };

            const result = await ensureShare(req);

            t.equal(result, share);
          },
        );

        t.test("if share has not been claimed", async (t) => {
          t.test("if share was intended for a different user", async (t) => {
            t.beforeEach(() => {
              share.toUsername = "other_user";
            });

            t.test("logs the expected warning", async (t) => {
              try {
                await ensureShare(req);
              } catch {}

              t.ok(logger.warn.called);
              t.equal(logger.warn.firstCall.args[0], share);
              t.equal(
                logger.warn.firstCall.args[1],
                "Share was intended for a different user",
              );
            });

            t.test(
              "if share was created by current user, throws expected informative error",
              async (t) => {
                share.createdBy.id = "user-id";

                t.rejects(() => ensureShare(req), {
                  message: "This share was intended for user @other_user",
                  statusCode: StatusCodes.FORBIDDEN,
                });
              },
            );

            t.test(
              "otherwise, throws expected more generic error",
              async (t) => {
                t.rejects(() => ensureShare(req), {
                  message: "Not Found",
                  statusCode: StatusCodes.NOT_FOUND,
                });
              },
            );
          });

          t.test(
            "if share was intended for any user, returns expected share",
            async (t) => {
              const result = await ensureShare(req);

              t.equal(result, share);
            },
          );
        });
      });
    });
  });

  t.test("renderSharedFile", async (t) => {
    const req = {
      user: { username: "bob" },
    };
    const res = {
      render: sinon.fake(),
    };
    const share = { id: "SHARE_ID", backingUrl: "https://foo.com/bar" };
    let renderSharedFile: any;

    t.beforeEach(async () => {
      renderSharedFile = importModule(t).renderSharedFile;
    });

    t.test("gets the file info from the backing URL", async (t) => {
      try {
        await renderSharedFile(req, res, share, "some/media-type");
      } catch {}

      t.ok(getFileInfoStub.called);
      t.equal(getFileInfoStub.firstCall.firstArg, "https://foo.com/bar");
    });

    t.test("if file doesn't exist, throws expected error", async (t) => {
      getFileInfoStub.resolves(undefined);

      t.rejects(() => renderSharedFile(req, res, share, "some/media-type"), {
        message: "File no longer exists",
        statusCode: StatusCodes.FORBIDDEN,
      });
    });

    t.test("when file does exist", async (t) => {
      const mediaType1 = {
        name: "some/media-type",
        description: "Some Media Type",
        extension: "some",
      };
      const mediaType2 = {
        name: "other/media-type",
        description: "Other Media Type",
        extension: "other",
      };

      const file = {
        title: "Some file",
        type: "document",
        availableMediaTypes: [mediaType1, mediaType2],
      };

      t.beforeEach(async () => {
        getFileInfoStub.resolves(file);
      });

      t.test(
        "if no media type is specified, renders HTML with expected view state",
        async (t) => {
          await renderSharedFile(req, res, share);

          t.ok(res.render.called);
          t.equal(res.render.firstCall.args[0], "shared_file");
          t.same(res.render.firstCall.args[1], {
            title: "Ready to download your shared file?",
            fileTitle: "Some file",
            fileType: "document",
            fileTypeStyle: "primary",
            downloadLinks: [
              {
                media_description: "Some Media Type",
                file_extension: "some",
                url: "/shares/SHARE_ID?media_type=some%2Fmedia-type",
              },
              {
                media_description: "Other Media Type",
                file_extension: "other",
                url: "/shares/SHARE_ID?media_type=other%2Fmedia-type",
              },
            ],
          });
        },
      );

      t.test("when a media type is specified", async (t) => {
        t.test(
          "if media type is not compatible with the file, throws expected error",
          async (t) => {
            t.rejects(() => renderSharedFile(req, res, share, "foo"), {
              message: "Unsupported media type for this file: foo",
            });
          },
        );

        t.test("sends the file contents to the server response", async (t) => {
          await renderSharedFile(req, res, share, "some/media-type");

          t.ok(sendFileStub.called);
          t.equal(sendFileStub.firstCall.args[0], file);
          t.equal(sendFileStub.firstCall.args[1], mediaType1);
          t.equal(sendFileStub.firstCall.args[2], res);
        });

        t.test("logs the file access", async (t) => {
          await renderSharedFile(req, res, share, "some/media-type");

          t.ok(logger.info.called);
          t.equal(logger.info.firstCall.args[0].share, share);
          t.equal(logger.info.firstCall.args[0].file, file);
          t.equal(logger.info.firstCall.args[0].mediaType, "some/media-type");
          t.equal(
            logger.info.firstCall.args[1],
            "Shared file downloaded by user 'bob'",
          );
        });
      });
    });
  });
});
