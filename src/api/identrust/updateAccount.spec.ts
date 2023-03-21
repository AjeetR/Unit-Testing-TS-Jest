import { getMockReq } from "@jest-mock/express";
import * as awsS3 from "../../utils/awsS3";
import * as common from "../../utils/common";
import { TypedRequest } from "../../types";
import { AccountCreate } from "../../schemas";
import request from "supertest";
import app from "../../app";
import { accountResponseData } from "./account";

const response = accountResponseData();

describe("update accounts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    const spyDownload = jest.spyOn(awsS3, "callDownloadS3File");
    spyDownload.mockResolvedValue(response.account);
  });

  test("From updateAccount", async () => {
    const requ: TypedRequest<AccountCreate, never, { accountId: string }> = getMockReq({
      params: { accountId: "account100" },
      body: {
        accountType: 10100,
        apiKey: "100key",
        apiPassword: "100Pass",
      },
    }) as object as TypedRequest<AccountCreate, never, { accountId: string }>;

    const mockEncrypt = jest.spyOn(common, "encrypt");
    mockEncrypt.mockResolvedValue(
      "9bf49e907a348a60fbfd4db2afc7981a:823bc0119b4cb79bc15b64ba553659dd"
    );

    const spyUpload = jest.spyOn(awsS3, "uploads3File");
    spyUpload.mockResolvedValue({
      statusCode: 200,
      message: "uploaded account information successfully to account.json file on AWS S3",
    });

    const res = await request(app).put(`/identrust/${requ.params.accountId}`).send(requ.body);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.message).toEqual("Updated account account100 with new data.");
  });

  test("Invalid request", async () => {
    const requ: TypedRequest<AccountCreate, never, { accountId: string }> = getMockReq({
      params: { accountId: "account100" },
      body: {
        accountType: "10100",
        apiKey: "100key",
        apiPassword: 100,
      },
    }) as object as TypedRequest<AccountCreate, never, { accountId: string }>;

    const response = await request(app).put(`/identrust/${requ.params.accountId}`).send(requ.body);
    expect(response.body).toMatchObject({
      message: "Invalid request type or schema",
      statusCode: 400,
    });
  });

  test("No data found accountID", async () => {
    const req: TypedRequest<AccountCreate, never, { accountId: string }> = getMockReq({
      params: { accountId: "account10" },
      body: {
        accountType: 10100,
        apiKey: "100key",
        apiPassword: "100Pass",
      },
    }) as object as TypedRequest<AccountCreate, never, { accountId: string }>;

    const response = await request(app).put(`/identrust/${req.params.accountId}`).send(req.body);
    expect(response.body).toMatchObject({
      message: "No Data found for accountId : account10",
      statusCode: 404,
    });
  });
});
