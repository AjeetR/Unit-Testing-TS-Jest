import { Accounts } from "../../schemas/accounts";
import { getMockReq } from "@jest-mock/express";
import * as awsS3 from "../../utils/awsS3";
import { TypedRequest, TypedRequestPath } from "../../types";
import request from "supertest";
import app from "../../app";
import { accountResponseData } from "./account";

const response = accountResponseData();

describe("get account", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    const spy = jest.spyOn(awsS3, "callDownloadS3File");
    spy.mockResolvedValue(response.account);
  });

  test("getAccount by Id", async () => {
    const requ: TypedRequestPath<{ accountId: string }> = getMockReq({
      params: { accountId: "account100" },
    }) as object as TypedRequest<Accounts, never, { accountId: string }>;

    const res = await request(app).get(`/identrust/${requ.params.accountId}`);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.message).toEqual("Account Details");
    expect(res.body.account.toString()).toEqual(response.account["account100"].toString());
  });

  test("Invalid request", async () => {
    const req: TypedRequest<Accounts, never, { accountId: string }> = getMockReq({
      params: { accountId: "account10" },
    }) as object as TypedRequest<Accounts, never, { accountId: string }>;

    const response = await request(app).get(`/identrust/${req.params.accountId}`);
    expect(response.body).toMatchObject({
      message: "No Data found for accountId : account10",
      statusCode: 404,
    });
  });
});
