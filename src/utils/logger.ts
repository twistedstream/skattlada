import pino from "pino";
import { logLevel, packageName } from "./config";

export const logger = pino({
  name: packageName,
  level: logLevel,
});
