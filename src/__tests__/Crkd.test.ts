import "reflect-metadata";
import { container } from "tsyringe";
import { ConfigService } from "../services/ConfigService";
import { Crkd } from "../commands/crkd";
import { Command } from "@oclif/core";
import { expect } from "@jest/globals";
import { Config } from "@oclif/core/lib/config";

// Mock the Command class
jest.mock("@oclif/core", () => ({
  ...jest.requireActual("@oclif/core"),
  Command: class extends (jest.requireActual("@oclif/core").Command as typeof Command) {
    constructor(argv: string[], config: Config) {
      super(argv, config);
    }

    async run(): Promise<void> {
      // Mock implementation of run method
    }
  },
}));

describe("Crkd Command", () => {
  let crkdCommand: Crkd;

  beforeEach(() => {
    const config = new (Command as any)([], {} as Config).config;
    crkdCommand = new Crkd([], config);
  });

  test("should initialize a default crkdrc.json configuration file", async () => {
    const mockCreateDefaultConfig = jest.spyOn(ConfigService, "createDefaultConfig");
    await crkdCommand.run(["--init"]);
    expect(mockCreateDefaultConfig).toHaveBeenCalled();
  });

  test("should throw an error if both interactive mode and message argument are provided", async () => {
    await expect(crkdCommand.run(["--interactive", "Add error handling"])).rejects.toThrow(
      "Cannot provide both interactive mode and message argument"
    );
  });

  test("should throw an error if neither interactive mode nor message argument is provided", async () => {
    await expect(crkdCommand.run([])).rejects.toThrow(
      "Must provide either interactive mode or message argument"
    );
  });

  test("should handle auto-scaler warning when a different model is specified", async () => {
    const mockWarn = jest.spyOn(crkdCommand, "warn");
    await crkdCommand.run(["--autoScaler", "--model", "gpt-3"]);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Warning: --auto-scaler flag is enabled.")
    );
  });

  test("should validate the provider and throw an error if it's invalid", async () => {
    await expect(crkdCommand.run(["--provider", "invalid-provider"])).rejects.toThrow(
      "Invalid provider: invalid-provider"
    );
  });
});