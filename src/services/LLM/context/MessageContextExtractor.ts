import { singleton } from "tsyringe";
import {
  MessageCommandOperation,
  MessageFileOperation,
} from "./MessageContextStore";

type MessageOperation = MessageFileOperation | MessageCommandOperation;

@singleton()
export class MessageContextExtractor {
  public extractNonOperationContent(content: string): string {
    return content
      .replace(/<read_file>[\s\S]*?<\/read_file>/g, "")
      .replace(/<write_file>[\s\S]*?<\/write_file>/g, "")
      .replace(/<execute_command>[\s\S]*?<\/execute_command>/g, "")
      .replace(/<phase_prompt>[\s\S]*?<\/phase_prompt>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  public extractOperations(content: string): MessageOperation[] {
    const operations: MessageOperation[] = [];
    const now = Date.now();

    // Extract read_file operations
    const readMatches = Array.from(
      content.matchAll(/<read_file>[\s\S]*?<path>(.*?)<\/path>/g),
    );
    readMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "read_file",
          path: match[1],
          timestamp: now,
        });
      }
    });

    // Extract write_file operations
    const writeMatches = Array.from(
      content.matchAll(/<write_file>[\s\S]*?<path>(.*?)<\/path>/g),
    );
    writeMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "write_file",
          path: match[1],
          timestamp: now,
        });
      }
    });

    // Extract execute_command operations
    const commandMatches = Array.from(
      content.matchAll(/<execute_command>[\s\S]*?<command>(.*?)<\/command>/g),
    );
    commandMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "execute_command",
          command: match[1],
          timestamp: now,
        });
      }
    });

    return operations;
  }

  public extractPhasePrompt(content: string): string | null {
    const match = content.match(/<phase_prompt>([\s\S]*?)<\/phase_prompt>/);
    return match ? match[1].trim() : null;
  }
}
