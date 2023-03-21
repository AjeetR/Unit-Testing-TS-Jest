import { getMockReq } from "@jest-mock/express";
import * as awsS3 from "../../utils/awsS3";
import * as common from "../../utils/common";
import { AccountCreate } from "../../schemas";
import { TypedRequest } from "../../types";
import request from "supertest";
import app from "../../app";
import { accountResponseData } from "./account";

describe("create accounts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    const response = accountResponseData();
    const spyDownload = jest.spyOn(awsS3, "callDownloadS3File");
    spyDownload.mockResolvedValue(response.account);
  });

  test("Test creating account", async () => {
    const requ: TypedRequest<AccountCreate, never, { accountId: string }> = getMockReq({
      params: { accountId: "account101" },
      body: {
        accountType: 10101,
        apiKey: "101key",
        apiPassword: "101Pass",
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

    const res = await request(app).post(`/identrust/${requ.params.accountId}`).send(requ.body);
    expect(res.body.statusCode).toBe(201);
    expect(res.body.message).toEqual("Account Created");
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

    const response = await request(app).post(`/identrust/${requ.params.accountId}`).send(requ.body);
    expect(response.body).toMatchObject({
      message: "Invalid request type or schema",
      statusCode: 400,
    });
  });

  test("Account Already Exist", async () => {
    const requ: TypedRequest<AccountCreate, never, { accountId: string }> = getMockReq({
      params: { accountId: "account001" },
      body: {
        accountType: 10001,
        apiKey: "001key",
        apiPassword: "001Pass",
      },
    }) as object as TypedRequest<AccountCreate, never, { accountId: string }>;

    const response = await request(app).post(`/identrust/${requ.params.accountId}`).send(requ.body);
    expect(response.body).toMatchObject({
      message: "AccountId : account001 already exist.",
      statusCode: 403,
    });
  });
});
