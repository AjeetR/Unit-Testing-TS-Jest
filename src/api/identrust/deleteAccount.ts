import { callDownloadS3File, uploads3File } from "../../utils/awsS3";
import { logger } from "../../utils/logger";
import { TypedRequestPath, TypedResponse } from "../../types";
import { AccountRes } from "../../schemas";
import { NextFunction, Router } from "express";
import { NotFoundError } from "../../utils/error";

export const deleteAccount = async (req: TypedRequestPath<{ accountId: string }>) => {
  const accountId = req.params.accountId.toString();
  const accounts = await callDownloadS3File();
  if (!(accountId in accounts)) {
    throw new NotFoundError(`No Data found for accountId : ${accountId}`);
  }
  const deletedAccountData = {
    [accountId]: accounts[accountId],
  };
  delete accounts[accountId];
  await uploads3File(accounts);
  const response: AccountRes = {
    account: deletedAccountData,
    statusCode: 200,
    message: "Account Deleted",
  };
  return response;
};

export function addRoute(router: Router): void {
  router.delete(
    "/:accountId",
    async (
      req: TypedRequestPath<{ accountId: string }>,
      res: TypedResponse<AccountRes>,
      next: NextFunction
    ) => {
      try {
        const response = await deleteAccount(req);
        logger.info(JSON.stringify(response));
        res.status(response.statusCode).send(response);
      } catch (error) {
        next(error);
      }
    }
  );
}
