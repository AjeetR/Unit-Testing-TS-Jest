import { AccountRes } from "../../schemas";
import { callDownloadS3File } from "../../utils/awsS3";
import { logger } from "../../utils/logger";
import { TypedRequest, TypedResponse } from "../../types";
import { NextFunction, Router } from "express";
import { NotFoundError } from "../../utils/error";

export const getAllAccounts = async () => {
  const accounts = await callDownloadS3File();
  if (JSON.stringify(accounts) == "{}" || !accounts) {
    throw new NotFoundError("No content in the file.");
  }
  const response: AccountRes = {
    account: accounts,
    statusCode: 200,
    message: "Accounts List",
  };
  return response;
};

export function addRoute(router: Router): void {
  router.get(
    "/",
    async (
      req: TypedRequest<never, never, never>,
      res: TypedResponse<AccountRes>,
      next: NextFunction
    ) => {
      try {
        const response = await getAllAccounts();
        logger.info(JSON.stringify(response));
        res.status(response.statusCode).send(response);
      } catch (error) {
        next(error);
      }
    }
  );
}
