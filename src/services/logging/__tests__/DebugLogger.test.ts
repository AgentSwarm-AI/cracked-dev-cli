import { DebugLogger } from "@services/logging/DebugLogger";
import { container } from "tsyringe";

describe("DebugLogger", () => {
  let logger: DebugLogger;
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    logger = container.resolve(DebugLogger);
  });

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("should not log messages when debug is false", () => {
    logger.log("INFO", "This should not log");
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  test("should log messages when debug is true", () => {
    logger.setDebug(true);
    logger.log("INFO", "This should log");
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  test("should log formatted messages with a timestamp", () => {
    logger.setDebug(true);
    const message = "Testing formatted log";
    logger.log("INFO", message);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("DEBUG"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(message),
    );
  });

  test("should format data as JSON if object is provided", () => {
    logger.setDebug(true);
    const data = { key: "value", num: 42 };
    logger.log("INFO", "Logging object data", data);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"key": "value"'),
    );
  });

  test("should handle null data without errors", () => {
    logger.setDebug(true);
    logger.log("INFO", "Logging null data", null);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});