import { callDownloadS3File, uploads3File } from "../../utils/awsS3";
import { checkFields } from "../../utils/checkFields";
import { encrypt } from "../../utils/common";
import { logger } from "../../utils/logger";
import { TypedRequest, TypedResponse } from "../../types";
import { AccountCreate, AccountRes, Accounts } from "../../schemas";
import { NextFunction, Router } from "express";
import { BadRequestError, NotFoundError } from "../../utils/error";

export const updateAccount = async (
  req: TypedRequest<AccountCreate, never, { accountId: string }>
) => {
  const accountId = req.params.accountId.toString();
  if (!checkFields(req.body)) {
    throw new BadRequestError("Invalid request type or schema");
  }
  const accounts = await callDownloadS3File();
  if (!(accountId in accounts)) {
    throw new NotFoundError(`No Data found for accountId : ${accountId}`);
  }
  const newAccountData: Accounts = {
    [accountId]: {
      accountType: req.body.accountType,
      apiKey: req.body.apiKey,
      apiPassword: await encrypt(req.body.apiPassword),
    },
  };
  await uploads3File({ ...accounts, ...newAccountData });
  const response: AccountRes = {
    account: newAccountData,
    statusCode: 200,
    message: `Updated account ${accountId} with new data.`,
  };
  return response;
};

export function addRoute(router: Router): void {
  router.put(
    "/:accountId",
    async (
      req: TypedRequest<AccountCreate, never, { accountId: string }>,
      res: TypedResponse<AccountRes>,
      next: NextFunction
    ) => {
      try {
        const response = await updateAccount(req);
        logger.info(JSON.stringify(response));
        res.status(response.statusCode).send(response);
      } catch (error) {
        next(error);
      }
    }
  );
}
