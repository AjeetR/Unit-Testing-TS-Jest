import AWS from "aws-sdk";
import { logger } from "../utils/logger";
import { GetObjectOutput, GetObjectRequest, HeadObjectRequest } from "aws-sdk/clients/s3";
import { AccountRes } from "../schemas/accountRes";
import { Accounts } from "../schemas";
import { BadRequestError, NotFoundError } from "./error";

export const getS3Client = (): AWS.S3 => {
  AWS.config.update({ region: process.env.AWS_REGION });
  return new AWS.S3();
};

//Download file from s3
export const callDownloadS3File = async (): Promise<Accounts> => {
  const params = {
    Bucket: process.env.BUCKET, // bucket name
    Key: process.env.KEYFILE, // file name
  };
  const s3 = getS3Client();
  if (!(await checkBucketExists())) {
    throw new NotFoundError("Bucket or file doesn't exist");
  }
  const result: GetObjectOutput | Accounts = await s3
    .getObject(params as GetObjectRequest)
    .promise();
  if (!result?.Body) {
    throw new NotFoundError("Data not found or failed to download from AWS S3");
  }
  logger.info("Downloaded accounts info successful from AWS S3");
  const accounts = JSON.parse(result.Body.toString());
  Object.keys(accounts).map((accountId) => {
    delete accounts[accountId]["apiPassword"]; //removing apiPassword in the response
  });
  return accounts;
};

//uploading file to s3 bucket
export const uploads3File = async (accounts: Accounts): Promise<AccountRes> => {
  const params = {
    Bucket: process.env.BUCKET, // bucket name
    Key: process.env.KEYFILE, // file name
    ContentType: "application/json", //File type
    Body: JSON.stringify(accounts), //Data load
  };
  const s3 = getS3Client();
  const result = await s3.putObject(params as GetObjectRequest).promise();
  if (!result) {
    throw new BadRequestError("Failed to upload data to AWS S3");
  }
  return {
    statusCode: 200,
    message: "uploaded account information successfully to account.json file on AWS S3",
  };
};

export const checkBucketExists = async (): Promise<boolean> => {
  const s3 = getS3Client();
  const options = {
    Bucket: process.env.BUCKET,
    Key: process.env.KEYFILE,
  };
  try {
    await s3.headObject(options as HeadObjectRequest).promise();
    return true;
  } catch {
    return false;
  }
};
