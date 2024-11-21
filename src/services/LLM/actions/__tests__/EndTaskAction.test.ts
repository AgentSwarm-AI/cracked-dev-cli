import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { EndTaskAction } from "@services/LLM/actions/EndTaskAction";

describe("EndTaskAction", () => {
  let endTaskAction: EndTaskAction;
  let actionTagsExtractor: ActionTagsExtractor;

  beforeEach(() => {
    actionTagsExtractor = new ActionTagsExtractor(); // Providing necessary dependencies
    endTaskAction = new EndTaskAction(actionTagsExtractor);
  });

  it("should end a task successfully", async () => {
    const result = await endTaskAction.execute(
      "<message>Task completed</message>",
    );
    expect(result.success).toBe(true); // Adjust based on actual implementation
  });
});
