import request from "supertest";
import * as awsS3 from "../../utils/awsS3";
import app from "../../app";
import { accountResponseData } from "./account";

const response = accountResponseData();

describe("get all accounts", () => {
  test("getting account list", async () => {
    const spy = jest.spyOn(awsS3, "callDownloadS3File");
    spy.mockResolvedValue(response.account);

    const res = await request(app).get("/identrust/");
    expect(res.body.statusCode).toBe(200);
    expect(res.body.message).toEqual("Accounts List");
    expect(res.body.account.toString()).toEqual(response.account.toString());
  });

  test("No content in the file.", async () => {
    const spy = jest.spyOn(awsS3, "callDownloadS3File");
    spy.mockResolvedValue({});

    const response = await request(app).get("/identrust/");
    expect(response.body).toMatchObject({
      message: "No content in the file.",
      statusCode: 404,
    });
  });

  test("Empty route", async () => {
    const response = await request(app).get(`/`);
    expect(response.body).toMatchObject({ statusCode: 404, message: "Invalid Request" });
  });
});
