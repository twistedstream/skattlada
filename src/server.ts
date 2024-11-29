// NOTE: The config import should always run first to load the environment
import { baseUrl, environment, port, rpID } from "./utils/config";
// makes it so no need to try/catch errors in middleware
import "express-async-errors";

import fs from "fs";
import http from "http";
import https from "https";
import { Server } from "net";
import path from "path";

import app from "./app";
import { getDataProvider, getFileProvider, getMetadataProvider } from "./data";
import { initializeServices } from "./services";
import { logger } from "./utils/logger";

let server: Server;
let serverName: string;

if (environment === "production") {
  // Docker: create simple HTTP server
  serverName = "HTTP";
  server = http.createServer(app);
} else {
  // local: create HTTPS server with self-signed cert
  serverName = "HTTPS";
  const certOptions = {
    key: fs.readFileSync(path.resolve("./cert/dev.key")),
    cert: fs.readFileSync(path.resolve("./cert/dev.crt")),
  };
  server = https.createServer(certOptions, app);
}

const dataProvider = getDataProvider();
const fileProvider = getFileProvider();
const metadataProvider = getMetadataProvider();

(async () => {
  // initialize providers and services before starting server
  await dataProvider.initialize();
  await fileProvider.initialize();
  await metadataProvider.initialize();

  const firstInvite = await initializeServices();
  if (firstInvite) {
    logger.info(
      {
        url: `${baseUrl}/invites/${firstInvite.id}`,
      },
      "Root invite",
    );
  }

  server.listen(port, () => {
    logger.info(
      {
        port,
        rpID,
        baseUrl,
      },
      `${serverName} server started`,
    );
  });
})();

export default server;
