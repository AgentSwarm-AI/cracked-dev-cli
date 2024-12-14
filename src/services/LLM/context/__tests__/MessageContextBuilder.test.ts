// src/services/LLM/context/__tests__/MessageContextBuilder.test.ts

import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { container } from "tsyringe";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { MessageContextExtractor } from "../MessageContextExtractor";
import {
  MessageCommandOperation,
  MessageContextStore,
  MessageFileOperation,
} from "../MessageContextStore";

describe("MessageContextBuilder", () => {
  let messageContextBuilder: MessageContextBuilder;
  let messageContextStore: MessageContextStore;
  let mocker: UnitTestMocker;
  let messageContextExtractor: MessageContextExtractor;

  beforeEach(() => {
    // Resolve dependencies from the container
    messageContextStore = container.resolve(MessageContextStore);
    messageContextExtractor = container.resolve(MessageContextExtractor);
    messageContextBuilder = container.resolve(MessageContextBuilder);
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    // Clear all mocks after each test
    mocker.clearAllMocks();
    // Reset the context store to its initial state
    messageContextStore.setContextData({
      systemInstructions: "",
      phaseInstructions: new Map(),
      conversationHistory: [],
      fileOperations: new Map(),
      commandOperations: new Map(),
    });
  });

  it("should build message context for user role correctly", () => {
    const contextData = messageContextStore.getContextData();
    const updatedData = messageContextBuilder.buildMessageContext(
      "user",
      "hello",
      "phase1",
      contextData,
    );
    expect(updatedData.conversationHistory).toHaveLength(1);
    expect(updatedData.conversationHistory[0].role).toBe("user");
    expect(updatedData.conversationHistory[0].content).toBe("hello");
    expect(updatedData.phaseInstructions.size).toBe(0);

    const updatedData2 = messageContextBuilder.buildMessageContext(
      "user",
      "hello <phase_prompt>instruction</phase_prompt>",
      "phase1",
      updatedData,
    );
    expect(updatedData2.conversationHistory).toHaveLength(2);
    expect(updatedData2.conversationHistory[1].role).toBe("user");
    expect(updatedData2.conversationHistory[1].content).toBe(
      "hello <phase_prompt>instruction</phase_prompt>",
    );
    expect(updatedData2.phaseInstructions.size).toBe(1);
    expect(updatedData2.phaseInstructions.get("phase1")?.content).toBe(
      "instruction",
    );
  });

  it("should build message context for assistant role correctly with operations", () => {
    mocker
      .spyPrototype(MessageContextExtractor, "extractOperations")
      .mockReturnValue([
        { type: "read_file", path: "file1", timestamp: Date.now() },
      ] as any);
    const contextData = messageContextStore.getContextData();
    const updatedData = messageContextBuilder.buildMessageContext(
      "assistant",
      "ok <read_file><path>file1</path></read_file>",
      "phase1",
      contextData,
    );
    expect(updatedData.conversationHistory).toHaveLength(1);
    expect(updatedData.conversationHistory[0].role).toBe("assistant");
    expect(updatedData.conversationHistory[0].content).toBe(
      "ok <read_file><path>file1</path></read_file>",
    );
    expect(updatedData.fileOperations.size).toBe(1);
    expect(updatedData.fileOperations.get("file1")?.type).toBe("read_file");

    mocker
      .spyPrototype(MessageContextExtractor, "extractOperations")
      .mockReturnValue([
        { type: "read_file", path: "file1", timestamp: Date.now() },
      ] as any);
    const updatedData2 = messageContextBuilder.buildMessageContext(
      "assistant",
      "ok <read_file><path>file1</path></read_file> <phase_prompt>instruction</phase_prompt>",
      "phase1",
      updatedData,
    );
    expect(updatedData2.conversationHistory).toHaveLength(2);
    expect(updatedData2.conversationHistory[1].role).toBe("assistant");
    expect(updatedData2.conversationHistory[1].content).toBe(
      "ok <read_file><path>file1</path></read_file> <phase_prompt>instruction</phase_prompt>",
    );
    expect(updatedData2.fileOperations.size).toBe(1);
    expect(updatedData2.phaseInstructions.size).toBe(1);
    expect(updatedData2.phaseInstructions.get("phase1")?.content).toBe(
      "instruction",
    );
  });

  it("should build message context for assistant role correctly without operations", () => {
    mocker
      .spyPrototype(MessageContextExtractor, "extractOperations")
      .mockReturnValue([]);
    const contextData = messageContextStore.getContextData();
    const updatedData = messageContextBuilder.buildMessageContext(
      "assistant",
      "ok",
      "phase1",
      contextData,
    );
    expect(updatedData.conversationHistory).toHaveLength(1);
    expect(updatedData.conversationHistory[0].role).toBe("assistant");
    expect(updatedData.conversationHistory[0].content).toBe("ok");
    expect(updatedData.fileOperations.size).toBe(0);
  });

  it("should build message context for system role correctly", () => {
    mocker
      .spyPrototype(MessageContextExtractor, "extractOperations")
      .mockReturnValue([]);
    const contextData = messageContextStore.getContextData();
    const updatedData = messageContextBuilder.buildMessageContext(
      "system",
      "instructions",
      "phase1",
      contextData,
    );
    expect(updatedData.conversationHistory).toHaveLength(1);
    expect(updatedData.conversationHistory[0].role).toBe("system");
    expect(updatedData.conversationHistory[0].content).toBe("instructions");
    expect(updatedData.fileOperations.size).toBe(0);

    mocker
      .spyPrototype(MessageContextExtractor, "extractOperations")
      .mockReturnValue([
        { type: "read_file", path: "file1", timestamp: Date.now() },
      ] as any);
    const updatedData2 = messageContextBuilder.buildMessageContext(
      "system",
      "instructions <read_file><path>file1</path></read_file>",
      "phase1",
      updatedData,
    );
    expect(updatedData2.conversationHistory).toHaveLength(2);
    expect(updatedData2.conversationHistory[1].role).toBe("system");
    expect(updatedData2.conversationHistory[1].content).toBe(
      "instructions <read_file><path>file1</path></read_file>",
    );
    expect(updatedData2.fileOperations.size).toBe(1);
    expect(updatedData2.fileOperations.get("file1")?.type).toBe("read_file");
  });

  it("should throw an error for empty content", () => {
    const contextData = messageContextStore.getContextData();
    expect(() => {
      messageContextBuilder.buildMessageContext(
        "user",
        "   ",
        "phase1",
        contextData,
      );
    }).toThrowError("Content cannot be empty");
  });

  it("should update operation result correctly for execute command", () => {
    const contextData = messageContextStore.getContextData();

    // First update: Success
    const updatedData = messageContextBuilder.updateOperationResult(
      "execute_command",
      "command1",
      "output1",
      contextData,
      true,
      undefined,
    );
    expect(updatedData.commandOperations.size).toBe(1);
    expect(updatedData.commandOperations.get("command1")?.output).toBe(
      "output1",
    );
    expect(updatedData.commandOperations.get("command1")?.success).toBe(true);
    expect(
      updatedData.commandOperations.get("command1")?.error,
    ).toBeUndefined();

    // Second update: Attempt to set to failure (should be ignored)
    const updatedData2 = messageContextBuilder.updateOperationResult(
      "execute_command",
      "command1",
      "output2",
      updatedData,
      false,
      "error",
    );
    expect(updatedData2.commandOperations.size).toBe(1);

    // Ensure the operation was not updated
    expect(updatedData2.commandOperations.get("command1")?.output).toBe(
      "output1",
    );
    expect(updatedData2.commandOperations.get("command1")?.success).toBe(true);
    expect(
      updatedData2.commandOperations.get("command1")?.error,
    ).toBeUndefined();
  });

  it("should update operation result correctly for write file", () => {
    const contextData = messageContextStore.getContextData();

    // First update: Success
    const updatedData = messageContextBuilder.updateOperationResult(
      "write_file",
      "file1",
      "content1",
      contextData,
      true,
      undefined,
    );
    expect(updatedData.fileOperations.size).toBe(1);
    expect(updatedData.fileOperations.get("file1")?.content).toBe("content1");
    expect(updatedData.fileOperations.get("file1")?.success).toBe(true);
    expect(updatedData.fileOperations.get("file1")?.error).toBeUndefined();

    // Second update: Attempt to set to failure (should be ignored)
    const updatedData2 = messageContextBuilder.updateOperationResult(
      "write_file",
      "file1",
      "content2",
      updatedData,
      false,
      "error",
    );
    expect(updatedData2.fileOperations.size).toBe(1);

    // Ensure the operation was not updated
    expect(updatedData2.fileOperations.get("file1")?.content).toBe("content1");
    expect(updatedData2.fileOperations.get("file1")?.success).toBe(true);
    expect(updatedData2.fileOperations.get("file1")?.error).toBeUndefined();
  });

  it("should not update operation result if already succeeded", () => {
    const contextData = messageContextStore.getContextData();

    // First update for write_file: Success
    const updatedData = messageContextBuilder.updateOperationResult(
      "write_file",
      "file1",
      "content1",
      contextData,
      true,
      undefined,
    );

    // Second update for write_file: Attempt to update (should be ignored)
    const updatedData2 = messageContextBuilder.updateOperationResult(
      "write_file",
      "file1",
      "content2",
      updatedData,
      true,
      undefined,
    );
    expect(updatedData2.fileOperations.size).toBe(1);
    expect(updatedData2.fileOperations.get("file1")?.content).toBe("content1");

    // First update for execute_command: Success
    const updatedData3 = messageContextBuilder.updateOperationResult(
      "execute_command",
      "command1",
      "output1",
      updatedData2,
      true,
      undefined,
    );

    // Second update for execute_command: Attempt to update (should be ignored)
    const updatedData4 = messageContextBuilder.updateOperationResult(
      "execute_command",
      "command1",
      "output2",
      updatedData3,
      true,
      undefined,
    );
    expect(updatedData4.commandOperations.size).toBe(1);
    expect(updatedData4.commandOperations.get("command1")?.output).toBe(
      "output1",
    );
  });

  it("should get message context correctly", () => {
    // Define file operations
    const fileOperations = new Map<string, MessageFileOperation>([
      [
        "file1",
        {
          type: "read_file",
          path: "file1",
          timestamp: 1,
          success: true,
          content: "content1",
        },
      ],
      [
        "file2",
        {
          type: "write_file",
          path: "file2",
          timestamp: 2,
          success: false,
          content: "content2",
          error: "error",
        },
      ],
    ]);

    // Define command operations
    const commandOperations = new Map<string, MessageCommandOperation>([
      [
        "command1",
        {
          type: "execute_command",
          command: "command1",
          timestamp: 3,
          success: true,
          output: "output1",
        },
      ],
      [
        "command2",
        {
          type: "execute_command",
          command: "command2",
          timestamp: 4,
          success: false,
          output: "output2",
          error: "error",
        },
      ],
    ]);

    // Set the complete context data
    messageContextStore.setContextData({
      systemInstructions: "system instruction",
      phaseInstructions: new Map([
        ["phase1", { phase: "phase1", content: "instruction", timestamp: 1 }],
      ]),
      conversationHistory: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
      fileOperations,
      commandOperations,
    });

    const messages = messageContextBuilder.getMessageContext(
      messageContextStore.getContextData(),
    );

    expect(messages).toHaveLength(7);
    expect(messages[0].content).toBe("system instruction");
    expect(messages[1].content).toBe(
      "<phase_prompt>instruction</phase_prompt>",
    );
    expect(messages[2].content).toBe(
      "Content of file1 [SUCCESS]\nContent:\ncontent1",
    );
    expect(messages[3].content).toBe(
      "Written to file2 [FAILED (Error: error)]\nContent:\ncontent2",
    );
    expect(messages[4].content).toBe(
      "Command: command1 [SUCCESS]\nOutput:\noutput1",
    );
    expect(messages[5].content).toBe(
      "Command: command2 [FAILED (Error: error)]\nOutput:\noutput2",
    );
    expect(messages[6].content).toBe("hello");
  });

  it("should get latest phase instructions correctly", () => {
    messageContextStore.setContextData({
      phaseInstructions: new Map([
        ["phase1", { phase: "phase1", content: "instruction1", timestamp: 1 }],
        ["phase2", { phase: "phase2", content: "instruction2", timestamp: 2 }],
      ]),
      systemInstructions: "",
      conversationHistory: [],
      fileOperations: new Map(),
      commandOperations: new Map(),
    });

    const latestInstructions = messageContextBuilder.getLatestPhaseInstructions(
      messageContextStore.getContextData(),
    );
    expect(latestInstructions).toBe("instruction2");
  });

  it("should get file operation correctly", () => {
    messageContextStore.setContextData({
      fileOperations: new Map([
        [
          "file1",
          {
            type: "read_file",
            path: "file1",
            timestamp: 1,
            content: "content1",
            success: true,
          },
        ],
        [
          "file2",
          {
            type: "write_file",
            path: "file2",
            timestamp: 2,
            content: "content2",
            success: false,
            error: "error",
          },
        ],
      ]),
      systemInstructions: "",
      phaseInstructions: new Map(),
      conversationHistory: [],
      commandOperations: new Map(),
    });
    const fileOperation = messageContextBuilder.getFileOperation(
      "file1",
      messageContextStore.getContextData(),
    );
    expect(fileOperation?.content).toBe("content1");
    expect(fileOperation?.success).toBe(true);
    expect(fileOperation?.error).toBeUndefined();

    const fileOperation2 = messageContextBuilder.getFileOperation(
      "file2",
      messageContextStore.getContextData(),
    );
    expect(fileOperation2?.content).toBe("content2");
    expect(fileOperation2?.success).toBe(false);
    expect(fileOperation2?.error).toBe("error");
  });

  it("should get command operation correctly", () => {
    messageContextStore.setContextData({
      commandOperations: new Map([
        [
          "command1",
          {
            type: "execute_command",
            command: "command1",
            timestamp: 1,
            output: "output1",
            success: true,
          },
        ],
        [
          "command2",
          {
            type: "execute_command",
            command: "command2",
            timestamp: 2,
            output: "output2",
            success: false,
            error: "error",
          },
        ],
      ]),
      systemInstructions: "",
      phaseInstructions: new Map(),
      conversationHistory: [],
      fileOperations: new Map(),
    });
    const commandOperation = messageContextBuilder.getCommandOperation(
      "command1",
      messageContextStore.getContextData(),
    );
    expect(commandOperation?.output).toBe("output1");
    expect(commandOperation?.success).toBe(true);
    expect(commandOperation?.error).toBeUndefined();

    const commandOperation2 = messageContextBuilder.getCommandOperation(
      "command2",
      messageContextStore.getContextData(),
    );
    expect(commandOperation2?.output).toBe("output2");
    expect(commandOperation2?.success).toBe(false);
    expect(commandOperation2?.error).toBe("error");
  });
});
