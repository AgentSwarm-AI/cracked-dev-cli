import { MessageContextBuilder } from "../MessageContextBuilder";

describe("MessageContextBuilder", () => {
  let messageContextBuilder: MessageContextBuilder;

  beforeEach(() => {
    messageContextBuilder = new MessageContextBuilder();
  });

  describe("processMessage", () => {
    it("should process phase instructions", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        Some content`,
      });

      expect(messageContextBuilder.getLatestPhaseInstructions()).toBe(
        "Discovery Phase",
      );
    });

    it("should process file operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      const operation =
        messageContextBuilder.getFileOperation("/path/to/file1");
      expect(operation).toBeDefined();
      expect(operation?.type).toBe("read_file");
    });

    it("should process command operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command>
          <command>npm install</command>
        </execute_command>`,
      });

      const operation =
        messageContextBuilder.getCommandOperation("npm install");
      expect(operation).toBeDefined();
      expect(operation?.type).toBe("execute_command");
    });

    it("should update existing operations with new ones", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      const operations = messageContextBuilder.getConversationHistory();
      expect(operations.length).toBe(1);
    });
  });

  describe("updateOperationResult", () => {
    it("should update read file operation result", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file1",
        "file content",
      );

      const context = messageContextBuilder.getConversationHistory();
      expect(context[0].content).toContain("file content");
    });

    it("should update command operation result", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command>
          <command>npm install</command>
        </execute_command>`,
      });

      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm install",
        "packages installed successfully",
      );

      const context = messageContextBuilder.getConversationHistory();
      expect(context[0].content).toContain("packages installed successfully");
    });
  });

  describe("getConversationHistory", () => {
    it("should build context with all operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>
        <execute_command>
          <command>npm install</command>
        </execute_command>`,
      });

      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file1",
        "file content",
      );
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm install",
        "packages installed successfully",
      );

      const context = messageContextBuilder.getConversationHistory();
      expect(context.length).toBe(3);
      expect(context[0].content).toContain("Discovery Phase");
      expect(context[1].content).toContain("file content");
      expect(context[2].content).toContain("packages installed successfully");
    });
  });

  describe("clear", () => {
    it("should clear all stored operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      messageContextBuilder.clear();

      expect(messageContextBuilder.getConversationHistory()).toEqual([]);
      expect(messageContextBuilder.getLatestPhaseInstructions()).toBeNull();
      expect(
        messageContextBuilder.getFileOperation("/path/to/file1"),
      ).toBeUndefined();
    });
  });
});
