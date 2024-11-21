import { CommandAction } from "@services/LLM/actions/CommandAction";
import { container } from "tsyringe";

describe("CommandAction", () => {
  let commandAction: CommandAction;

  beforeEach(() => {
    commandAction = container.resolve(CommandAction);
  });

  it("should execute a valid command", async () => {
    const result = await commandAction.execute("echo Test Command");
    expect(result.data.trim()).toBe("Test Command");
  });

  it("should handle stderr output without throwing", async () => {
    const result = await commandAction.execute(
      "ls nonexistentfile 2>&1 || true",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("nonexistentfile");
  });

  it("should return error result for invalid command", async () => {
    const result = await commandAction.execute("invalidCommand");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Command failed with exit code");
    expect(result.data).toContain("not found");
  });

  it("should extract command from execute_command tags", async () => {
    const result = await commandAction.execute(
      "<execute_command>echo Test Command</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data.trim()).toBe("Test Command");
  });

  it("should handle empty command", async () => {
    const result = await commandAction.execute("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("No valid command to execute.");
  });
});
