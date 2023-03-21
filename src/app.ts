import express, { ErrorRequestHandler } from "express";
import AccountsRoute from "./api/identrust/index";
import bodyParser from "body-parser";
import swagger from "./swagger";
import { HttpError } from "./utils/error";

const app = express();
app.use(bodyParser.json());
app.use("/identrust/swagger", swagger);
app.use("/identrust", AccountsRoute);
app.use(() => {
  throw new HttpError(404, "Invalid Request");
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: Error, req: never, res: express.Response, next: express.NextFunction) {
  const message = err.message;
  let statusCode = 500;

  if (err instanceof HttpError) {
    statusCode = err.status;
  }

  res.status(statusCode).json({
    message,
    statusCode,
  });
}

app.use(errorHandler as ErrorRequestHandler);

export default app;
