import { createLogger, format, transports } from "winston";

const myFormat = format.printf(({ level, message, timestamp }) => {
  return `[${timestamp} ${level}] ${message}`;
});

export const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), myFormat),
  transports: [new transports.Console()],
});
