import sinon from "sinon";
import { t, Test } from "tap";

// test objects

const logger = {
  info: sinon.fake(),
};

const inMemoryDataProviderConstructorFake = sinon.fake();
class MockInMemoryDataProvider {
  constructor(options: any) {
    inMemoryDataProviderConstructorFake(options);
    this.isMock = true;
  }

  isMock: boolean;
}

const googleSheetsDataProviderConstructorFake = sinon.fake();
class MockGoogleSheetsDataProvider {
  constructor(options: any) {
    googleSheetsDataProviderConstructorFake(options);
    this.isMock = true;
  }

  isMock: boolean;
}

const localFileProviderConstructorFake = sinon.fake();
class MockLocalFileProvider {
  constructor() {
    localFileProviderConstructorFake();
    this.isMock = true;
  }

  isMock: boolean;
}

const googleDriveFileProviderConstructorFake = sinon.fake();
class MockGoogleDriveFileProvider {
  constructor() {
    googleDriveFileProviderConstructorFake();
    this.isMock = true;
  }

  isMock: boolean;
}

const localMetadataProviderConstructorFake = sinon.fake();
class MockLocalMetadataProvider {
  constructor() {
    localMetadataProviderConstructorFake();
    this.isMock = true;
  }

  isMock: boolean;
}

const passkeyProviderAaguidsMetadataProviderConstructorFake = sinon.fake();
class MockPasskeyProviderAaguidsMetadataProvider {
  constructor() {
    passkeyProviderAaguidsMetadataProviderConstructorFake();
    this.isMock = true;
  }

  isMock: boolean;
}

// helpers

type ImportModuleOptions = {
  dataProviderName?: string;
  fileProviderName?: string;
  metadataProviderName?: string;
};

function importModule(t: Test, options: ImportModuleOptions = {}) {
  const { dataProviderName, fileProviderName, metadataProviderName } = options;

  return t.mockRequire("./index", {
    "../utils/config": {
      dataProviderName,
      fileProviderName,
      metadataProviderName,
    },
    "../utils/logger": { logger },
    "./data-providers/in-memory": {
      InMemoryDataProvider: MockInMemoryDataProvider,
    },
    "./data-providers/google-sheets": {
      GoogleSheetsDataProvider: MockGoogleSheetsDataProvider,
    },
    "./file-providers/local": {
      LocalFileProvider: MockLocalFileProvider,
    },
    "./file-providers/google-drive": {
      GoogleDriveFileProvider: MockGoogleDriveFileProvider,
    },
    "./metadata-providers/local": {
      LocalMetadataProvider: MockLocalMetadataProvider,
    },
    "./metadata-providers/passkey-authenticator-aaguids": {
      PasskeyProviderAaguidsMetadataProvider:
        MockPasskeyProviderAaguidsMetadataProvider,
    },
  });
}

// tests

t.test("data/index", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("getDataProvider", async (t) => {
    t.test("when provider hasn't been loaded yet", async (t) => {
      t.test(
        "if no provider is configured, throw expected exception",
        async (t) => {
          const { getDataProvider } = importModule(t);

          t.throws(() => getDataProvider(), {
            name: "AssertionError",
            message: "Missing config: data provider name",
          });
        },
      );

      t.test("if 'in-memory' provider configured, create it", async (t) => {
        const { getDataProvider } = importModule(t, {
          dataProviderName: "in-memory",
        });

        getDataProvider();

        t.ok(inMemoryDataProviderConstructorFake.called);
        t.same(inMemoryDataProviderConstructorFake.firstCall.firstArg, {
          users: [],
          credentials: [],
          invites: [],
          shares: [],
        });
      });

      t.test("if 'google-sheets' provider configured, create it", async (t) => {
        const { getDataProvider } = importModule(t, {
          dataProviderName: "google-sheets",
        });

        getDataProvider();

        t.ok(googleSheetsDataProviderConstructorFake.called);
        // constructor called with no args
        t.equal(
          googleSheetsDataProviderConstructorFake.firstCall.firstArg,
          undefined,
        );
      });

      t.test(
        "if configured provider is not supported, throw expected exception",
        async (t) => {
          const { getDataProvider } = importModule(t, {
            dataProviderName: "no-exist",
          });

          t.throws(() => getDataProvider(), {
            name: "AssertionError",
            message: "Unsupported data provider name: no-exist",
          });
        },
      );

      t.test("log loaded data provider name", async (t) => {
        const { getDataProvider } = importModule(t, {
          dataProviderName: "in-memory",
        });

        getDataProvider();

        t.ok(logger.info.called);
        t.match(logger.info.firstCall.firstArg, "in-memory");
      });

      t.test("return loaded data provider", async (t) => {
        const { getDataProvider } = importModule(t, {
          dataProviderName: "in-memory",
        });

        const result = getDataProvider();

        t.ok(result);
        t.ok(result.isMock);
      });
    });

    t.test("return cached provider", async (t) => {
      const { getDataProvider } = importModule(t, {
        dataProviderName: "in-memory",
      });

      getDataProvider();
      sinon.resetHistory();

      const result = getDataProvider();

      t.ok(result);
      t.ok(result.isMock);
      t.notOk(inMemoryDataProviderConstructorFake.called);
    });
  });

  t.test("getFileProvider", async (t) => {
    t.test("when provider hasn't been loaded yet", async (t) => {
      t.test(
        "if no provider is configured, throw expected exception",
        async (t) => {
          const { getFileProvider } = importModule(t);

          t.throws(() => getFileProvider(), {
            name: "AssertionError",
            message: "Missing config: file provider name",
          });
        },
      );

      t.test("if 'local' provider configured, create it", async (t) => {
        const { getFileProvider } = importModule(t, {
          fileProviderName: "local",
        });

        getFileProvider();

        t.ok(localFileProviderConstructorFake.called);
        t.equal(localFileProviderConstructorFake.firstCall.args.length, 0);
      });

      t.test("if 'google-drive' provider configured, create it", async (t) => {
        const { getFileProvider } = importModule(t, {
          fileProviderName: "google-drive",
        });

        getFileProvider();

        t.ok(googleDriveFileProviderConstructorFake.called);
        t.equal(
          googleDriveFileProviderConstructorFake.firstCall.args.length,
          0,
        );
      });

      t.test(
        "if configured provider is not supported, throw expected exception",
        async (t) => {
          const { getFileProvider } = importModule(t, {
            fileProviderName: "no-exist",
          });

          t.throws(() => getFileProvider(), {
            name: "AssertionError",
            message: "Unsupported file provider name: no-exist",
          });
        },
      );

      t.test("log loaded data provider name", async (t) => {
        const { getFileProvider } = importModule(t, {
          fileProviderName: "local",
        });

        getFileProvider();

        t.ok(logger.info.called);
        t.match(logger.info.firstCall.firstArg, "local");
      });

      t.test("return loaded data provider", async (t) => {
        const { getFileProvider } = importModule(t, {
          fileProviderName: "local",
        });

        const result = getFileProvider();

        t.ok(result);
        t.ok(result.isMock);
      });
    });

    t.test("return cached provider", async (t) => {
      const { getFileProvider } = importModule(t, {
        fileProviderName: "local",
      });

      getFileProvider();
      sinon.resetHistory();

      const result = getFileProvider();

      t.ok(result);
      t.ok(result.isMock);
      t.notOk(localFileProviderConstructorFake.called);
    });
  });

  t.test("getMetadataProvider", async (t) => {
    t.test("when provider hasn't been loaded yet", async (t) => {
      t.test(
        "if no provider is configured, throw expected exception",
        async (t) => {
          const { getMetadataProvider } = importModule(t);

          t.throws(() => getMetadataProvider(), {
            name: "AssertionError",
            message: "Missing config: metadata provider name",
          });
        },
      );

      t.test("if 'local' provider configured, create it", async (t) => {
        const { getMetadataProvider } = importModule(t, {
          metadataProviderName: "local",
        });

        getMetadataProvider();

        t.ok(localMetadataProviderConstructorFake.called);
        t.equal(localMetadataProviderConstructorFake.firstCall.args.length, 0);
      });

      t.test(
        "if 'passkey-authenticator-aaguids' provider configured, create it",
        async (t) => {
          const { getMetadataProvider } = importModule(t, {
            metadataProviderName: "passkey-authenticator-aaguids",
          });

          getMetadataProvider();

          t.ok(passkeyProviderAaguidsMetadataProviderConstructorFake.called);
          t.equal(
            passkeyProviderAaguidsMetadataProviderConstructorFake.firstCall.args
              .length,
            0,
          );
        },
      );

      t.test(
        "if configured provider is not supported, throw expected exception",
        async (t) => {
          const { getMetadataProvider } = importModule(t, {
            metadataProviderName: "no-exist",
          });

          t.throws(() => getMetadataProvider(), {
            name: "AssertionError",
            message: "Unsupported metadata provider name: no-exist",
          });
        },
      );

      t.test("log loaded data provider name", async (t) => {
        const { getMetadataProvider } = importModule(t, {
          metadataProviderName: "local",
        });

        getMetadataProvider();

        t.ok(logger.info.called);
        t.match(logger.info.firstCall.firstArg, "local");
      });

      t.test("return loaded data provider", async (t) => {
        const { getMetadataProvider } = importModule(t, {
          metadataProviderName: "local",
        });

        const result = getMetadataProvider();

        t.ok(result);
        t.ok(result.isMock);
      });
    });

    t.test("return cached provider", async (t) => {
      const { getMetadataProvider } = importModule(t, {
        metadataProviderName: "local",
      });

      getMetadataProvider();
      sinon.resetHistory();

      const result = getMetadataProvider();

      t.ok(result);
      t.ok(result.isMock);
      t.notOk(localMetadataProviderConstructorFake.called);
    });
  });
});
