import { CommandAction } from "@services/LLM/actions/CommandAction";
import { container } from "tsyringe";

describe("CommandAction", () => {
  let commandAction: CommandAction;

  beforeEach(() => {
    commandAction = container.resolve(CommandAction);
  });

  it("should execute a command within execute_command tags", async () => {
    const result = await commandAction.execute(
      "<execute_command>echo Test Command</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data.trim()).toBe("Test Command");
  });

  it("should handle stderr output without throwing", async () => {
    const result = await commandAction.execute(
      "<execute_command>ls nonexistentfile 2>&1 || true</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("nonexistentfile");
  });

  it("should return error result for invalid command", async () => {
    const result = await commandAction.execute(
      "<execute_command>invalidCommand</execute_command>",
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("Command failed with exit code");
  });

  it("should handle empty command", async () => {
    const result = await commandAction.execute("");
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("No valid command to execute");
  });

  it("should handle command with whitespace", async () => {
    const result = await commandAction.execute(`
      <execute_command>
        echo Test Command
      </execute_command>
    `);
    expect(result.success).toBe(true);
    expect(result.data.trim()).toBe("Test Command");
  });
});
