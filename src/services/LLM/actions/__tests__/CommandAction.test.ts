import { container } from "tsyringe";
import { CommandAction } from "../CommandAction";

describe("CommandAction", () => {
  let commandAction: CommandAction;

  beforeEach(() => {
    commandAction = container.resolve(CommandAction);
  });

  it("should execute a valid command", async () => {
    const result = await commandAction.execute("echo Test Command");
    expect(result.data.trim()).toBe("Test Command"); // Adjusting to check the right property
  });

  it("should throw an error for invalid command", async () => {
    await expect(commandAction.execute("invalidCommand")).rejects.toThrow();
  });
});
