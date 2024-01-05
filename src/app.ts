import express, { Express } from "express";
import { engine } from "express-handlebars";
import expressPino from "express-pino-logger";

import errorHandler from "./error-handler";
import { packageDescription, packageVersion } from "./utils/config";
import { logger } from "./utils/logger";
import website from "./website";

const app: Express = express();

// App-level middleware
app.use(expressPino({ logger }));

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
  })
);

// Configure website
app.use(website);

// Configure error handling
errorHandler(app);

export default app;
