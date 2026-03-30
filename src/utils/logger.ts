

import winston from "winston";
import { environment } from "../config/environment.js";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const stackTrace = stack ? `\n${stack}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stackTrace}`;
  })
);

export const logger = winston.createLogger({
  level: environment.LOG_LEVEL,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});
