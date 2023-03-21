import * as common from "./common";

interface kmsInstance {
  generateRandom: AWS.KMS | jest.Mock;
}

describe("Common.ts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    const response = {
      Plaintext: Buffer.from([
        75, 161, 200, 72, 10, 93, 95, 169, 95, 12, 20, 233, 120, 138, 9, 253,
      ]),
    };
    const kmsinstance: kmsInstance = {
      generateRandom: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue(response),
      }),
    };
    jest.spyOn(common, "kmsClient").mockReturnValue(kmsinstance as object as AWS.KMS);
  });
  const apiPassword = "10104Pass";
  test("Common encrypt - kms", async () => {
    process.env.DATA_KEY = "fakedatakeyforunittestingencryptfunction@123";
    process.env.AWS_REGION = "ab-region-1";
    const result = await common.encrypt(apiPassword);
    expect(result).toMatch(/[A-Za-z0-9]+:[A-Za-z0-9]+/);
  });

  test("Common encrypt - crypto", async () => {
    process.env.DATA_KEY = "fakedatakeyforunittestingencryptfunction@123";
    process.env.AWS_REGION = "";
    const result = await common.encrypt(apiPassword);
    expect(result).toMatch(/[A-Za-z0-9]+:[A-Za-z0-9]+/);
  });

  test("No DataKey for encryp", async () => {
    process.env.DATA_KEY = "";
    try {
      await common.encrypt(apiPassword);
    } catch (error) {
      expect(error).toMatchObject({
        message: "DATA_KEY is not configured",
        status: 403,
      });
    }
  });
});
