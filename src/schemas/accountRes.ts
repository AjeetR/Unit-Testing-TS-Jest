import { Accounts } from "./accounts";

export interface AccountRes {
  account?: Accounts;
  statusCode: number;
  message?: string;
}
