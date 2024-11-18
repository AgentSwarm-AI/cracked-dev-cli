import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { IActionResult } from "./types/ActionTypes";

@autoInjectable()
export class EndTaskAction {
  constructor(private actionTagsExtractor: ActionTagsExtractor) {}

  async execute(content: string): Promise<IActionResult> {
    const message = this.actionTagsExtractor.extractTag(content, "message");
    if (!message) {
      return {
        success: false,
        error: new Error(
          "Invalid end_task format. Must include <message> tag.",
        ),
      };
    }

    console.log(`📝 End task message: ${message}`);
    return {
      success: true,
      data: message,
    };
  }
}
