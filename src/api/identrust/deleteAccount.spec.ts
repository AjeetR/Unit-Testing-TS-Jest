import { Accounts } from "../../schemas/accounts";
import { getMockReq } from "@jest-mock/express";
import * as awsS3 from "../../utils/awsS3";
import { TypedRequest } from "../../types";
import request from "supertest";
import app from "../../app";
import { accountResponseData } from "./account";

const response = accountResponseData();

describe("delete accounts", () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    const spyDownload = jest.spyOn(awsS3, "callDownloadS3File");
    spyDownload.mockResolvedValue(response.account);
  });

  test("From deleteAccount", async () => {
    const requ: TypedRequest<Accounts, never, { accountId: string }> = getMockReq({
      params: { accountId: "account100" },
    }) as object as TypedRequest<Accounts, never, { accountId: string }>;

    const spyUpload = jest.spyOn(awsS3, "uploads3File");
    spyUpload.mockResolvedValue({
      statusCode: 200,
      message: "uploaded account information successfully to account.json file on AWS S3",
    });

    const res = await request(app).delete(`/identrust/${requ.params.accountId}`);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.message).toEqual("Account Deleted");
  });

  test("Invalid request", async () => {
    const req: TypedRequest<Accounts, never, { accountId: string }> = getMockReq({
      params: { accountId: "account10" },
    }) as object as TypedRequest<Accounts, never, { accountId: string }>;

    const response = await request(app).delete(`/identrust/${req.params.accountId}`);
    expect(response.body).toMatchObject({
      statusCode: 404,
      message: "No Data found for accountId : account10",
    });
  });
});
