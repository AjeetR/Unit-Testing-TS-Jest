import * as awsS3 from "./awsS3";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import { checkBucketExists } from "./awsS3";
import { accountResponseData } from "../api/identrust/account";

const response = accountResponseData();

interface s3Instance {
  getObject: AWS.S3 | jest.Mock;
}

interface s3InstanceUpload {
  putObject: AWS.S3 | jest.Mock;
}

interface s3headInstance {
  headObject: AWS.S3 | jest.Mock;
}

describe("S3 Tests", () => {
  let s3instance: s3Instance;
  let s3instanceUpload: s3InstanceUpload;
  const responseBuffer: GetObjectOutput | Buffer = {
    Body: Buffer.from(JSON.stringify(response.account)),
  };
  afterEach(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    (process.env.BUCKET = "test-bucket"), (process.env.KEYFILE = "test-key");
  });

  it("Download File from S3", async () => {
    s3instance = {
      getObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(responseBuffer),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3instance as object as AWS.S3);

    const checkSpy = jest.spyOn(awsS3, "checkBucketExists");
    checkSpy.mockResolvedValue(true);

    const result = await awsS3.callDownloadS3File(); //callDownloadS3File
    expect(result).toMatchObject(response.account);
  });

  it("Bucket of Object doesn't exist, download error", async () => {
    const checkSpy = jest.spyOn(awsS3, "checkBucketExists");
    checkSpy.mockResolvedValue(false);

    try {
      await awsS3.callDownloadS3File();
    } catch (error) {
      expect(error).toMatchObject({
        status: 404,
        message: "Bucket or file doesn't exist",
      });
    }
  });

  test("Data not found.", async () => {
    const checkSpy = jest.spyOn(awsS3, "checkBucketExists");
    checkSpy.mockResolvedValue(true);

    s3instance = {
      getObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(undefined),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3instance as object as AWS.S3);

    try {
      await awsS3.callDownloadS3File();
    } catch (error) {
      expect(error).toMatchObject({
        status: 404,
        message: "Data not found or failed to download from AWS S3",
      });
    }
  });

  it("Upload File to S3", async () => {
    const uploadResponse = {
      statusCode: 200,
      message: "uploaded account information successfully to account.json file on AWS S3",
    };

    s3instanceUpload = {
      putObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(uploadResponse),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3instanceUpload as object as AWS.S3);

    const result = await awsS3.uploads3File(response.account); //uploads3File
    expect(result).toMatchObject(uploadResponse);
  });

  test("Upload Failed.", async () => {
    const checkSpy = jest.spyOn(awsS3, "checkBucketExists");
    checkSpy.mockResolvedValue(true);

    s3instanceUpload = {
      putObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(undefined),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3instanceUpload as object as AWS.S3);

    try {
      await awsS3.uploads3File(response.account);
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        message: "Failed to upload data to AWS S3",
      });
    }
  });

  it("Check for S3 object in a bucket", async () => {
    const s3headinstance: s3headInstance = {
      headObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(true),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3headinstance as object as AWS.S3);
    const result = await checkBucketExists();
    expect(s3headinstance.headObject).toHaveBeenCalledWith({
      Bucket: process.env.BUCKET,
      Key: process.env.KEYFILE,
    });
    expect(result).toEqual(true);
  });

  it("Object doesn't exist in the bucket", async () => {
    const s3headFalse: s3headInstance = {
      headObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(true),
      }),
    };
    jest.spyOn(awsS3, "getS3Client").mockReturnValue(s3headFalse as object as AWS.S3);
    const result = await checkBucketExists();
    expect(result).toEqual(false);
  });
});
