import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const resolveMimeStub = sinon.stub();
const logger = {
  warn: sinon.stub(),
};

// helpers

function importModule(t: Test) {
  return t.mockRequire("./media-type", {
    "friendly-mimes": { resolveMime: resolveMimeStub },
    "./logger": { logger },
  });
}

// tests

t.test("utils/media-type", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fileTypeFromMediaType", async (t) => {
    const { fileTypeFromMediaType } = importModule(t);

    t.test(
      "returns expected 'document' file type from given media types",
      async (t) => {
        [
          "application/vnd.google-apps.document",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.oasis.opendocument.text",
          "application/x-vnd.oasis.opendocument.text",
          "application/rtf",
          "text/plain",
        ].forEach((name) => {
          const result = fileTypeFromMediaType({
            name,
          });

          t.equal(result, "document", name);
        });
      },
    );

    t.test("returns an expected 'spreadsheet' type", async (t) => {
      [
        "application/vnd.google-apps.spreadsheet",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/x-vnd.oasis.opendocument.spreadsheet",
        "text/csv",
        "text/tab-separated-values",
      ].forEach((name) => {
        const result = fileTypeFromMediaType({
          name,
        });

        t.equal(result, "spreadsheet", name);
      });
    });

    t.test("returns an expected 'presentation' type", async (t) => {
      [
        "application/vnd.google-apps.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.presentation",
        "application/x-vnd.oasis.opendocument.presentation",
      ].forEach((name) => {
        const result = fileTypeFromMediaType({
          name,
        });

        t.equal(result, "presentation", name);
      });
    });

    t.test("returns an expected 'pdf' type", async (t) => {
      ["application/pdf"].forEach((name) => {
        const result = fileTypeFromMediaType({
          name,
        });

        t.equal(result, "pdf", name);
      });
    });

    t.test("returns an expected 'image' type", async (t) => {
      [
        "application/vnd.google-apps.drawing",
        "image/jpeg",
        "image/png",
        "image/svg+xml",
      ].forEach((name) => {
        const result = fileTypeFromMediaType({
          name,
        });

        t.equal(result, "image", name);
      });
    });

    t.test("returns an expected 'video' type", async (t) => {
      ["video/mp4", "video/quicktime", "video/avi"].forEach((name) => {
        const result = fileTypeFromMediaType({
          name,
        });

        t.equal(result, "video", name);
      });
    });
  });

  t.test("mediaTypeFromMimeType", async (t) => {
    const { mediaTypeFromMimeType } = importModule(t);

    t.test("resolves the MIME from the MIME type string", async (t) => {
      try {
        mediaTypeFromMimeType("some-mime");
      } catch {}

      t.ok(resolveMimeStub.called);
      t.equal(resolveMimeStub.firstCall.firstArg, "some-mime");
    });

    t.test(
      "if an error occurs resolving the MIME, log it with warning and return nothing",
      async (t) => {
        const error = new Error("BOOM!");
        resolveMimeStub.throws(error);

        const result = mediaTypeFromMimeType("some-mime");

        t.ok(logger.warn.called);
        t.equal(logger.warn.firstCall.args[0], error);
        t.match(
          logger.warn.firstCall.args[1],
          "Unable to resolve mime data from mime type",
        );
        t.equal(result, undefined);
      },
    );

    t.test(
      "if a MIME is resolved, returns the expected media type",
      async (t) => {
        resolveMimeStub.returns({
          mime: "some-mime",
          name: "Some cool mime",
          fileType: ".foo",
        });

        const result = mediaTypeFromMimeType("some-mime");

        t.same(result, {
          name: "some-mime",
          description: "Some cool mime",
          extension: "foo",
        });
      },
    );
  });
});
