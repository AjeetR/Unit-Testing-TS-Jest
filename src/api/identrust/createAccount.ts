import { callDownloadS3File, uploads3File } from "../../utils/awsS3";
import { encrypt } from "../../utils/common";
import { checkFields } from "../../utils/checkFields";
import { logger } from "../../utils/logger";
import { TypedRequest, TypedResponse } from "../../types";
import { AccountCreate, AccountRes, Accounts } from "../../schemas";
import { NextFunction, Router } from "express";
import { BadRequestError, NotAllowedError } from "../../utils/error";

export const createAccount = async (
  req: TypedRequest<AccountCreate, never, { accountId: string }>
) => {
  const accountId = req.params.accountId.toString();
  if (!checkFields(req.body)) {
    throw new BadRequestError("Invalid request type or schema");
  }
  const accounts = await callDownloadS3File();
  if (accountId in accounts) {
    throw new NotAllowedError(`AccountId : ${accountId} already exist.`);
  }

  const newAccountData: Accounts = {
    [accountId]: {
      accountType: req.body.accountType,
      apiKey: req.body.apiKey.toString(),
      apiPassword: await encrypt(req.body.apiPassword),
    },
  };
  const newAccount = { ...accounts, ...newAccountData };
  await uploads3File(newAccount);
  const response: AccountRes = {
    account: newAccountData,
    statusCode: 201,
    message: "Account Created",
  };
  return response;
};

export function addRoute(router: Router): void {
  router.post(
    "/:accountId",
    async (
      req: TypedRequest<AccountCreate, never, { accountId: string }>,
      res: TypedResponse<AccountRes>,
      next: NextFunction
    ) => {
      try {
        const response = await createAccount(req);
        logger.info(JSON.stringify(response));
        res.status(response.statusCode).send(response);
      } catch (error) {
        next(error);
      }
    }
  );
}
