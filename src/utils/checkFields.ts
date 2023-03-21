import { Account } from "../schemas";

export const checkFields = (account: Account) => {
  return (
    typeof account.accountType == "number" &&
    typeof account.apiKey == "string" &&
    typeof account.apiPassword == "string"
  );
};
