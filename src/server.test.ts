import sinon from "sinon";
import { test } from "tap";

// test objects

const httpServer = {
  listen: sinon.stub(),
};
const http = {
  createServer: sinon.fake.returns(httpServer),
};
const httpsServer = {
  listen: sinon.stub(),
};
const https = {
  createServer: sinon.fake.returns(httpsServer),
};
const app = {};
const logger = {
  info: sinon.fake(),
  error: sinon.fake(),
};

const dataProvider = {
  initialize: sinon.stub(),
};
const fileProvider = {
  initialize: sinon.stub(),
};
const metadataProvider = {
  initialize: sinon.stub(),
};

const fs = {
  readFileSync: sinon.stub(),
};
const path = {
  resolve: sinon.stub(),
};

const initializeServicesStub = sinon.stub();

const rpID = "example.com";

// helpers

function importModule(
  test: Tap.Test,
  environment: "production" | "development",
  port: number,
  scheme: "http" | "https",
) {
  const { default: server } = test.mock("./server", {
    http,
    https,
    fs,
    path,
    "./utils/config": {
      environment,
      port,
      rpID,
      baseUrl: `${scheme}://${rpID}:${port}`,
    },
    "./app": app,
    "./utils/logger": {
      logger,
    },
    "./data": {
      getDataProvider: () => dataProvider,
      getFileProvider: () => fileProvider,
      getMetadataProvider: () => metadataProvider,
    },
    "./services": {
      initializeServices: initializeServicesStub,
    },
  });

  return server;
}

async function waitForServerListening() {
  const wait = new Promise<void>((resolve, _reject) => {
    httpServer.listen.callsFake(() => {
      resolve();
    });
    httpsServer.listen.callsFake(() => {
      resolve();
    });
  });

  return wait;
}

// tests

test("server", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("Initialization before server starts listening", async (t) => {
    function importServer() {
      importModule(t, "production", 4242, "http");
    }

    t.test("Data provider has been initialized", async (t) => {
      importServer();
      await waitForServerListening();

      t.ok(dataProvider.initialize.called);
    });

    t.test("File provider has been initialized", async (t) => {
      importServer();
      await waitForServerListening();

      t.ok(fileProvider.initialize.called);
    });

    t.test("Metadata provider has been initialized", async (t) => {
      importServer();
      await waitForServerListening();

      t.ok(metadataProvider.initialize.called);
    });

    t.test("Services", async (t) => {
      t.test("have been initialized", async (t) => {
        importServer();
        await waitForServerListening();

        t.ok(initializeServicesStub.called);
      });

      t.test("logs the first invite, if returned", async (t) => {
        initializeServicesStub.resolves({ id: "FIRST_INVITE" });

        importServer();
        await waitForServerListening();

        t.ok(logger.info.called);
        t.same(logger.info.firstCall.args[0], {
          url: "http://example.com:4242/invites/FIRST_INVITE",
        });
        t.equal(logger.info.firstCall.args[1], "Root invite");
      });

      t.test("logs nothing if no first invite returned", async (t) => {
        initializeServicesStub.resolves(undefined);

        importServer();
        await waitForServerListening();

        t.notOk(logger.info.called);
      });
    });
  });

  t.test("HTTP server", async (t) => {
    function importHttpServer() {
      return importModule(t, "production", 4242, "http");
    }

    t.test("is created using HTTP module and the express app", async (t) => {
      const server = importHttpServer();
      await waitForServerListening();

      t.ok(http.createServer.called);
      t.equal(http.createServer.firstCall.firstArg, app);
      t.equal(server, httpServer);
    });

    t.test("listens on expected port", async (t) => {
      importHttpServer();
      await waitForServerListening();

      t.ok(httpServer.listen.called);
      t.equal(httpServer.listen.firstCall.args[0], 4242);
    });

    t.test("logs when server is ready for requests", async (t) => {
      importHttpServer();
      await waitForServerListening();

      t.ok(httpServer.listen.called);
      const cb = <Function>httpServer.listen.firstCall.args[1];
      cb();

      t.same(logger.info.firstCall.firstArg, {
        port: 4242,
        rpID: "example.com",
        baseUrl: "http://example.com:4242",
      });
    });
  });

  t.test("HTTPS server", async (t) => {
    function importHttpsServer() {
      return importModule(t, "development", 4433, "https");
    }

    t.test(
      "is created using HTTPS module, a local cert, and the express app",
      async (t) => {
        path.resolve.withArgs("./cert/dev.key").returns("/root/cert/dev.key");
        path.resolve.withArgs("./cert/dev.crt").returns("/root/cert/dev.crt");
        fs.readFileSync.withArgs("/root/cert/dev.key").returns("DEV_KEY");
        fs.readFileSync.withArgs("/root/cert/dev.crt").returns("DEV_CERT");

        const server = importHttpsServer();
        await waitForServerListening();

        t.ok(https.createServer.called);
        t.same(https.createServer.firstCall.args[0], {
          key: "DEV_KEY",
          cert: "DEV_CERT",
        });
        t.equal(https.createServer.firstCall.args[1], app);
        t.equal(server, httpsServer);
      },
    );

    t.test("listens on expected port", async (t) => {
      importHttpsServer();
      await waitForServerListening();

      t.ok(httpsServer.listen.called);
      t.equal(httpsServer.listen.firstCall.args[0], 4433);
    });

    t.test("logs when server is ready for requests", async (t) => {
      importHttpsServer();
      await waitForServerListening();

      t.ok(httpsServer.listen.called);
      const cb = <Function>httpsServer.listen.firstCall.args[1];
      cb();

      t.ok(logger.info.called);
      t.same(logger.info.firstCall.firstArg, {
        port: 4433,
        rpID: "example.com",
        baseUrl: "https://example.com:4433",
      });
    });
  });
});
