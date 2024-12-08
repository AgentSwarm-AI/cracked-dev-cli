/* eslint-disable @typescript-eslint/ban-ts-comment */
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

    it("should handle multiple operations in a single message", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `
          <read_file>
            <path>/path/to/file1</path>
          </read_file>
          <write_file>
            <path>/path/to/file2</path>
            <content>New Content</content>
          </write_file>
          <execute_command>
            <command>ls -la</command>
          </execute_command>
        `,
      });

      const readOperation =
        messageContextBuilder.getFileOperation("/path/to/file1");
      const writeOperation =
        messageContextBuilder.getFileOperation("/path/to/file2");
      const commandOperation =
        messageContextBuilder.getCommandOperation("ls -la");

      expect(readOperation).toBeDefined();
      expect(readOperation?.type).toBe("read_file");

      expect(writeOperation).toBeDefined();
      expect(writeOperation?.type).toBe("write_file");
      expect(writeOperation?.content).toBeUndefined(); // Content is optional and not set yet

      expect(commandOperation).toBeDefined();
      expect(commandOperation?.type).toBe("execute_command");
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

    it("should handle messages with multiple phase prompts by taking the latest", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Initial Phase
        </phase_prompt>`,
      });

      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Updated Phase
        </phase_prompt>`,
      });

      expect(messageContextBuilder.getLatestPhaseInstructions()).toBe(
        "Updated Phase",
      );
    });

    it("should handle messages with malformed XML gracefully", () => {
      expect(() => {
        messageContextBuilder.processMessage({
          role: "assistant",
          content: `<read_file>
            <path>/path/to/file1</path>
          <!-- Missing closing tag for read_file -->`,
        });
      }).not.toThrow();

      const operation =
        messageContextBuilder.getFileOperation("/path/to/file1");
      expect(operation).toBeDefined();
      expect(operation?.type).toBe("read_file");
    });

    it("should ignore unknown operation types", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<unknown_operation>
          <data>Some data</data>
        </unknown_operation>`,
      });

      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(0);
    });
  });

  describe("addMessage", () => {
    it("should add user messages to conversation history", () => {
      messageContextBuilder.addMessage("user", "Hello, how can I help you?");
      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(1);
      expect(history[0].role).toBe("user");
      expect(history[0].content).toBe("Hello, how can I help you?");
    });

    it("should throw an error when adding a message with empty content", () => {
      expect(() => {
        messageContextBuilder.addMessage("user", "   ");
      }).toThrow("Content cannot be empty");
    });

    it("should add assistant messages without operations to conversation history", () => {
      messageContextBuilder.addMessage(
        "assistant",
        "Here is some information.",
      );
      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(1);
      expect(history[0].role).toBe("assistant");
      expect(history[0].content).toBe("Here is some information.");
    });

    it("should not add assistant messages with operations to conversation history", () => {
      messageContextBuilder.addMessage(
        "assistant",
        `<read_file><path>/path/to/file1</path></read_file>`,
      );
      const history = messageContextBuilder.getConversationHistory();

      // Expect one system message representing the read_file operation
      expect(history.length).toBe(1);
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("read_file operation on /path/to/file1");
    });

    it("should add assistant messages with both operations and non-operation content to conversation history", () => {
      messageContextBuilder.addMessage(
        "assistant",
        `Here is the file content:
     <read_file><path>/path/to/file1</path></read_file>`,
      );
      const history = messageContextBuilder.getConversationHistory();

      // Expect two messages: one system message for the operation and one assistant message for the non-operation content
      expect(history.length).toBe(2);

      // Check the system message
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("read_file operation on /path/to/file1");

      // Check the assistant message
      expect(history[1].role).toBe("assistant");
      expect(history[1].content).toBe("Here is the file content:");
    });

    it("should handle system messages appropriately", () => {
      messageContextBuilder.addMessage("system", "System initialized.");
      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(1);
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("System initialized.");
    });

    it("should not add system messages with operations to conversation history", () => {
      messageContextBuilder.addMessage(
        "system",
        `<execute_command><command>ls</command></execute_command>`,
      );
      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(0);
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

    it("should handle updating non-existent operations gracefully", () => {
      expect(() => {
        messageContextBuilder.updateOperationResult(
          "read_file",
          "/non/existent/path",
          "No content",
        );
      }).not.toThrow();

      const context = messageContextBuilder.getConversationHistory();
      expect(context.length).toBe(0);
    });

    it("should handle incorrect operation types gracefully", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      // Attempt to update with wrong type
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "/path/to/file1",
        "Should not update",
      );

      const context = messageContextBuilder.getConversationHistory();
      expect(context[0].content).not.toContain("Should not update");
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
      expect(context[0].role).toBe("system");
      expect(context[0].content).toContain("Discovery Phase");
      expect(context[1].role).toBe("system");
      expect(context[1].content).toContain("file content");
      expect(context[2].role).toBe("system");
      expect(context[2].content).toContain("packages installed successfully");
    });

    it("should include system instructions in the context", () => {
      messageContextBuilder.setSystemInstructions("System is operational.");
      messageContextBuilder.addMessage("user", "Hello!");

      const context = messageContextBuilder.getConversationHistory();
      expect(context.length).toBe(2);
      expect(context[0].role).toBe("system");
      expect(context[0].content).toBe("System is operational.");
      expect(context[1].role).toBe("user");
      expect(context[1].content).toBe("Hello!");
    });

    it("should exclude system instructions if not set", () => {
      messageContextBuilder.addMessage("user", "Hello!");

      const context = messageContextBuilder.getConversationHistory();
      expect(context.length).toBe(1);
      expect(context[0].role).toBe("user");
      expect(context[0].content).toBe("Hello!");
    });

    it("should build context correctly after clearing operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>
          Discovery Phase
        </phase_prompt>
        <read_file>
          <path>/path/to/file1</path>
        </read_file>`,
      });

      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file1",
        "file content",
      );

      messageContextBuilder.clear();

      const context = messageContextBuilder.getConversationHistory();
      expect(context.length).toBe(0);
      expect(messageContextBuilder.getLatestPhaseInstructions()).toBeNull();
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
      expect(
        messageContextBuilder.getCommandOperation("npm install"),
      ).toBeUndefined();
      expect(messageContextBuilder.getSystemInstructions()).toBeNull();
    });
  });

  describe("removeOldOperations", () => {
    it("should replace old file operations with new ones", () => {
      // Add first operation
      messageContextBuilder.addMessage(
        "assistant",
        `<read_file><path>/path/to/file.txt</path></read_file>`,
      );
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "old file content",
      );

      // Add second operation on the same file
      messageContextBuilder.addMessage(
        "assistant",
        `<read_file><path>/path/to/file.txt</path></read_file>`,
      );
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "new content",
      );

      const history = messageContextBuilder.getConversationHistory();
      const fileOperations = history.filter(
        (msg) =>
          msg.role === "system" && msg.content.includes("/path/to/file.txt"),
      );

      expect(fileOperations.length).toBe(1);
      expect(fileOperations[0].content).toContain("new content");
      expect(fileOperations[0].content).not.toContain("old file content");
    });

    it("should handle mixed operations correctly", () => {
      // File operation
      messageContextBuilder.addMessage(
        "assistant",
        `<read_file><path>/path/to/file.txt</path></read_file>`,
      );
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "file content",
      );

      // Command operation
      messageContextBuilder.addMessage(
        "assistant",
        `<execute_command><command>npm test</command></execute_command>`,
      );
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm test",
        "test output",
      );

      // New operation on the same file
      messageContextBuilder.addMessage(
        "assistant",
        `<read_file><path>/path/to/file.txt</path></read_file>`,
      );
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "new content",
      );

      const history = messageContextBuilder.getConversationHistory();

      const fileOperations = history.filter(
        (msg) =>
          msg.role === "system" && msg.content.includes("/path/to/file.txt"),
      );
      const commandOperations = history.filter(
        (msg) => msg.role === "system" && msg.content.includes("npm test"),
      );

      expect(fileOperations.length).toBe(1);
      expect(fileOperations[0].content).toContain("new content");
      expect(fileOperations[0].content).not.toContain("file content");

      expect(commandOperations.length).toBe(1);
      expect(commandOperations[0].content).toContain("test output");
    });

    it("should keep only the latest operation for a specific file", () => {
      // First read operation
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file><path>/path/to/file.txt</path></read_file>`,
      });
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "old content",
      );

      // Second read operation on the same file
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file><path>/path/to/file.txt</path></read_file>`,
      });
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file.txt",
        "new content",
      );

      const history = messageContextBuilder.getConversationHistory();
      const fileOperations = history.filter(
        (msg) =>
          msg.role === "system" && msg.content.includes("/path/to/file.txt"),
      );

      expect(fileOperations.length).toBe(1);
      expect(fileOperations[0].content).toContain("new content");
      expect(fileOperations[0].content).not.toContain("old content");
    });

    it("should keep operations for different files", () => {
      // Operation on first file
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file><path>/path/to/file1.txt</path></read_file>`,
      });
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file1.txt",
        "content 1",
      );

      // Operation on second file
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file><path>/path/to/file2.txt</path></read_file>`,
      });
      messageContextBuilder.updateOperationResult(
        "read_file",
        "/path/to/file2.txt",
        "content 2",
      );

      const history = messageContextBuilder.getConversationHistory();
      const fileOperations = history.filter(
        (msg) =>
          msg.role === "system" &&
          (msg.content.includes("file1.txt") ||
            msg.content.includes("file2.txt")),
      );

      expect(fileOperations.length).toBe(2);
      expect(fileOperations[0].content).toContain("content 1");
      expect(fileOperations[1].content).toContain("content 2");
    });

    it("should keep only the latest command operation", () => {
      // First command operation
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command><command>npm install</command></execute_command>`,
      });
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm install",
        "old output",
      );

      // Second command operation
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command><command>npm install</command></execute_command>`,
      });
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm install",
        "new output",
      );

      const history = messageContextBuilder.getConversationHistory();
      const commandOperations = history.filter(
        (msg) => msg.role === "system" && msg.content.includes("npm install"),
      );

      expect(commandOperations.length).toBe(1);
      expect(commandOperations[0].content).toContain("new output");
      expect(commandOperations[0].content).not.toContain("old output");
    });

    it("should keep different command operations", () => {
      // First command
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command><command>npm install</command></execute_command>`,
      });
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm install",
        "install output",
      );

      // Second command
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command><command>npm test</command></execute_command>`,
      });
      messageContextBuilder.updateOperationResult(
        "execute_command",
        "npm test",
        "test output",
      );

      const history = messageContextBuilder.getConversationHistory();
      const commandOperations = history.filter(
        (msg) => msg.role === "system" && msg.content.includes("Command:"),
      );

      expect(commandOperations.length).toBe(2);
      expect(commandOperations[0].content).toContain("install output");
      expect(commandOperations[1].content).toContain("test output");
    });
  });

  describe("setSystemInstructions and getSystemInstructions", () => {
    it("should set and get system instructions", () => {
      messageContextBuilder.setSystemInstructions("Initialize system.");

      const instructions = messageContextBuilder.getSystemInstructions();
      expect(instructions).toBe("Initialize system.");

      const history = messageContextBuilder.getConversationHistory();
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("Initialize system.");
    });

    it("should overwrite existing system instructions", () => {
      messageContextBuilder.setSystemInstructions("First instruction.");
      messageContextBuilder.setSystemInstructions("Updated instruction.");

      const instructions = messageContextBuilder.getSystemInstructions();
      expect(instructions).toBe("Updated instruction.");

      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(1);
      expect(history[0].role).toBe("system");
      expect(history[0].content).toBe("Updated instruction.");
    });

    it("should handle setting system instructions to null", () => {
      messageContextBuilder.setSystemInstructions("Initial instruction.");
      messageContextBuilder.setSystemInstructions(null);

      const instructions = messageContextBuilder.getSystemInstructions();
      expect(instructions).toBeNull();

      const history = messageContextBuilder.getConversationHistory();
      expect(history.length).toBe(0);
    });
  });

  describe("getLatestPhaseInstructions", () => {
    it("should return the latest phase instructions", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>Phase One</phase_prompt>`,
      });
      expect(messageContextBuilder.getLatestPhaseInstructions()).toBe(
        "Phase One",
      );

      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<phase_prompt>Phase Two</phase_prompt>`,
      });
      expect(messageContextBuilder.getLatestPhaseInstructions()).toBe(
        "Phase Two",
      );
    });

    it("should return null if no phase instructions are present", () => {
      expect(messageContextBuilder.getLatestPhaseInstructions()).toBeNull();
    });
  });

  describe("getFileOperation and getCommandOperation", () => {
    it("should retrieve specific file operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<read_file><path>/path/to/file1.txt</path></read_file>`,
      });

      const operation =
        messageContextBuilder.getFileOperation("/path/to/file1.txt");
      expect(operation).toBeDefined();
      expect(operation?.type).toBe("read_file");
    });

    it("should retrieve specific command operations", () => {
      messageContextBuilder.processMessage({
        role: "assistant",
        content: `<execute_command><command>git status</command></execute_command>`,
      });

      const operation = messageContextBuilder.getCommandOperation("git status");
      expect(operation).toBeDefined();
      expect(operation?.type).toBe("execute_command");
    });

    it("should return undefined for non-existent file operations", () => {
      const operation = messageContextBuilder.getFileOperation(
        "/non/existent/file.txt",
      );
      expect(operation).toBeUndefined();
    });

    it("should return undefined for non-existent command operations", () => {
      const operation = messageContextBuilder.getCommandOperation(
        "non-existent command",
      );
      expect(operation).toBeUndefined();
    });
  });

  describe("hasPhasePrompt", () => {
    it("should correctly identify presence of phase prompt", () => {
      const contentWithPhase = `<phase_prompt>Phase One</phase_prompt>`;
      const contentWithoutPhase = `No phase here.`;

      // @ts-ignore
      expect(messageContextBuilder.hasPhasePrompt(contentWithPhase)).toBe(true);
      // @ts-ignore
      expect(messageContextBuilder.hasPhasePrompt(contentWithoutPhase)).toBe(
        false,
      );
    });
  });

  describe("extractPhasePrompt", () => {
    it("should extract phase prompt content", () => {
      // @ts-ignore
      const prompt = messageContextBuilder.extractPhasePrompt(
        `<phase_prompt>Phase One</phase_prompt>`,
      );
      expect(prompt).toBe("Phase One");
    });

    it("should return null if no phase prompt is present", () => {
      // @ts-ignore
      const prompt = messageContextBuilder.extractPhasePrompt(`No phase here.`);
      expect(prompt).toBeNull();
    });

    it("should handle multiple phase prompts by extracting the first one", () => {
      // @ts-ignore
      const prompt = messageContextBuilder.extractPhasePrompt(
        `<phase_prompt>Phase One</phase_prompt>
         <phase_prompt>Phase Two</phase_prompt>`,
      );
      expect(prompt).toBe("Phase One");
    });

    it("should trim whitespace from phase prompt content", () => {
      // @ts-ignore
      const prompt = messageContextBuilder.extractPhasePrompt(
        `<phase_prompt>
          Phase One
        </phase_prompt>`,
      );
      expect(prompt).toBe("Phase One");
    });
  });

  describe("extractOperations", () => {
    it("should extract all operations from content", () => {
      // @ts-ignore
      const operations = messageContextBuilder.extractOperations(`
        <read_file><path>/path/to/file1.txt</path></read_file>
        <write_file><path>/path/to/file2.txt</path><content>Data</content></write_file>
        <execute_command><command>echo Hello</command></execute_command>
      `);

      expect(operations.length).toBe(3);
      expect(operations).toContainEqual({
        type: "read_file",
        path: "/path/to/file1.txt",
      });
      expect(operations).toContainEqual({
        type: "write_file",
        path: "/path/to/file2.txt",
      });
      expect(operations).toContainEqual({
        type: "execute_command",
        command: "echo Hello",
      });
    });

    it("should return an empty array if no operations are present", () => {
      // @ts-ignore
      const operations = messageContextBuilder.extractOperations(
        "No operations here.",
      );
      expect(operations).toEqual([]);
    });

    it("should handle malformed operation tags gracefully", () => {
      // @ts-ignore
      const operations = messageContextBuilder.extractOperations(`
        <read_file><path>/path/to/file1.txt</path>
        <write_file><path>/path/to/file2.txt</path><content>Data</content>
        <!-- Missing closing tags -->
      `);

      // Depending on implementation, it might partially extract or ignore malformed
      // Here, assuming it extracts what it can
      expect(operations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("hasPhasePrompt", () => {
    it("should correctly identify if content has a phase prompt", () => {
      const contentWithPhase = `<phase_prompt>Phase One</phase_prompt>`;
      const contentWithoutPhase = `No phase here.`;

      expect(messageContextBuilder["hasPhasePrompt"](contentWithPhase)).toBe(
        true,
      );
      expect(messageContextBuilder["hasPhasePrompt"](contentWithoutPhase)).toBe(
        false,
      );
    });
  });
});
