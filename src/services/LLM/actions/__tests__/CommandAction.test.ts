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
    expect(result.data).toContain("Test Command");
  });

  it("should handle stderr output as success with output", async () => {
    const result = await commandAction.execute(
      "<execute_command>ls nonexistentfile 2>&1</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("nonexistentfile");
  });

  it("should return success with error message for invalid command", async () => {
    const result = await commandAction.execute(
      "<execute_command>invalidCommand</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("invalidCommand: not found");
  });

  it("should handle empty command", async () => {
    const result = await commandAction.execute("");
    expect(result.success).toBe(false); // Still false for validation errors
    expect(result.error?.message).toBe("No valid command to execute");
  });

  it("should handle command with whitespace", async () => {
    const result = await commandAction.execute(`
      <execute_command>
        echo Test Command
      </execute_command>
    `);
    expect(result.success).toBe(true);
    expect(result.data).toContain("Test Command");
  });

  it("should return success with exit code for failed commands", async () => {
    const result = await commandAction.execute(
      "<execute_command>exit 1</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("Command completed with exit code 1");
  });

  it("should combine stdout and stderr in output", async () => {
    const result = await commandAction.execute(
      "<execute_command>echo success && echo error >&2</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("success");
    expect(result.data).toContain("error");
  });

  it("should handle command with multiple arguments", async () => {
    const result = await commandAction.execute(
      "<execute_command>echo arg1 arg2 arg3</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain("arg1 arg2 arg3");
  });

  it("should handle command with special characters", async () => {
    const result = await commandAction.execute(
      "<execute_command>echo $USER</execute_command>",
    );
    expect(result.success).toBe(true);
    expect(result.data).toContain(process.env.USER || "");
  });
});
