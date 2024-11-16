import { container } from "tsyringe";
import { DebugLogger } from "./DebugLogger";

describe("DebugLogger", () => {
  let logger: DebugLogger;

  beforeEach(() => {
    logger = container.resolve(DebugLogger);
  });

  test("should not log messages when debug is false", () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    logger.log("INFO", "This should not log");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("should log messages when debug is true", () => {
    logger.setDebug(true);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    logger.log("INFO", "This should log");
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  test("should log formatted messages with a timestamp", () => {
    logger.setDebug(true);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    const message = "Testing formatted log";
    logger.log("INFO", message);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("DEBUG"),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(message),
    );
    consoleLogSpy.mockRestore();
  });

  test("should format data as JSON if object is provided", () => {
    logger.setDebug(true);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    const data = { key: "value", num: 42 };
    logger.log("INFO", "Logging object data", data);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('"key": "value"'),
    );
    consoleLogSpy.mockRestore();
  });

  test("should handle null data without errors", () => {
    logger.setDebug(true);
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    logger.log("INFO", "Logging null data", null);
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
});
