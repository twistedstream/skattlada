import express, { Express } from "express";
import { engine } from "express-handlebars";
import helmet from "helmet";
import pinoHttp from "pino-http";

import errorHandler from "./error-handler";
import { packageDescription, packageVersion } from "./utils/config";
import { logger } from "./utils/logger";
import website from "./website";

const app: Express = express();

// Reduce server fingerprinting
app.disable("x-powered-by");

// App-level middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": [
          "'unsafe-inline'",
          "'self'",
          "cdn.jsdelivr.net",
          "unpkg.com",
        ],
      },
    },
  }),
);
app.use(pinoHttp({ logger }));

app.use(express.static("public"));

app.set("view engine", "handlebars");
app.engine(
  "handlebars",
  engine({
    defaultLayout: "main",
    helpers: {
      product: () => packageDescription,
      version: () => packageVersion,
    },
  }),
);

// Configure website
app.use(website);

// Configure error handling
errorHandler(app);

export default app;
