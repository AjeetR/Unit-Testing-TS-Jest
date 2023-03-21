import { callDownloadS3File } from "../../utils/awsS3";
import { logger } from "../../utils/logger";
import { TypedRequestPath, TypedResponse } from "../../types";
import { AccountRes } from "../../schemas";
import { NextFunction, Router } from "express";
import { NotFoundError } from "../../utils/error";

export const getAccount = async (req: TypedRequestPath<{ accountId: string }>) => {
  const accountId = req.params.accountId.toString();
  const accounts = await callDownloadS3File();
  if (!(accountId in accounts)) {
    throw new NotFoundError(`No Data found for accountId : ${accountId}`);
  }
  const account = {
    [accountId]: accounts[accountId],
  };
  const response: AccountRes = {
    account: account,
    statusCode: 200,
    message: "Account Details",
  };
  return response;
};

export function addRoute(router: Router): void {
  router.get(
    "/:accountId",
    async (
      req: TypedRequestPath<{ accountId: string }>,
      res: TypedResponse<AccountRes>,
      next: NextFunction
    ) => {
      try {
        const response = await getAccount(req);
        logger.info(JSON.stringify(response));
        res.status(response.statusCode).send(response);
      } catch (error) {
        next(error);
      }
    }
  );
}
