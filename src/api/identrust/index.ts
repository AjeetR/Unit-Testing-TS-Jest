import express from "express";
import * as createAccount from "./createAccount";
import * as updateAccount from "./updateAccount";
import * as getAllAccounts from "./getAllAccounts";
import * as getAccount from "./getAccount";
import * as deleteAccount from "./deleteAccount";

const route = express.Router();

createAccount.addRoute(route);
updateAccount.addRoute(route);
getAllAccounts.addRoute(route);
getAccount.addRoute(route);
deleteAccount.addRoute(route);

export default route;
