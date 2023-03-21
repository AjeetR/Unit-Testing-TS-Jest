import type { Config } from "@jest/types";

export default async (): Promise<Config.InitialOptions> => {
  return {
    collectCoverage: true,
    preset: "ts-jest",
    coverageDirectory: "./coverage",
    testEnvironment: 'node',
    globals: {
      "ts-jest": {
        isolatedModules: true,
      },
    },
    testMatch: [
      "**/?(*.)+(test).ts",
      "**/?(*.)+(spec).ts",
      "**/?(*.)+(test).js",
      "**/?(*.)+(spec).js",
    ],
    resetMocks: true,
    clearMocks: true,
    verbose: true,
    testPathIgnorePatterns: ["<rootDir>/src/swagger", "<rootDir>/dist"],
    coveragePathIgnorePatterns: ["<rootDir>/src/swagger", "<rootDir>/dist"],
  };
};