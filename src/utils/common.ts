import crypto from "crypto";
import * as dotenv from "dotenv";
import AWS from "aws-sdk";
import { NotAllowedError } from "./error";
dotenv.config();

/* istanbul ignore next */
export const kmsClient = (): AWS.KMS => {
  AWS.config.update({ region: process.env.AWS_REGION });
  return new AWS.KMS();
};

export const encrypt = async (str: string): Promise<string> => {
  if (!process.env.DATA_KEY) {
    throw new NotAllowedError("DATA_KEY is not configured");
  }
  const iv: Buffer = (await generateRandom(16)) as Buffer;
  const key: Buffer = Buffer.from(process.env.DATA_KEY, "base64");
  const cipher: crypto.Cipher = crypto.createCipheriv("aes256", key, iv);
  let encrypted = cipher.update(str, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const generateRandom = async (numberOfBytes: number): Promise<Buffer> => {
  if (!process.env.AWS_REGION) {
    return crypto.randomBytes(numberOfBytes);
  }
  const kms = kmsClient();
  const data = await kms.generateRandom({ NumberOfBytes: numberOfBytes }).promise();
  return data.Plaintext as Buffer;
};
