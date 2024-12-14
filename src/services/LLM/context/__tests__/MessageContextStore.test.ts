/* eslint-disable @typescript-eslint/ban-ts-comment */
import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";
import { container } from "tsyringe";
import {
  MessageCommandOperation,
  MessageContextStore,
  MessageFileOperation,
} from "../MessageContextStore";

describe("MessageContextStore", () => {
  let messageContextStore: MessageContextStore;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    messageContextStore = container.resolve(MessageContextStore);
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should initialize with an empty context data", () => {
    const contextData = messageContextStore.getContextData();
    expect(contextData.phaseInstructions.size).toBe(0);
    expect(contextData.fileOperations.size).toBe(0);
    expect(contextData.commandOperations.size).toBe(0);
    expect(contextData.conversationHistory).toEqual([]);
    expect(contextData.systemInstructions).toBeNull();
  });

  it("should set and get context data correctly", () => {
    const mockData = {
      phaseInstructions: new Map([
        ["phase1", { phase: "phase1", content: "instruction", timestamp: 123 }],
      ]),
      fileOperations: new Map<string, MessageFileOperation>([
        ["file1", { type: "read_file", path: "file1", timestamp: 456 }],
      ]),
      commandOperations: new Map<string, MessageCommandOperation>([
        [
          "command1",
          { type: "execute_command", command: "command1", timestamp: 789 },
        ],
      ]),
      conversationHistory: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
      systemInstructions: "system instruction",
    };
    messageContextStore.setContextData(mockData);
    const contextData = messageContextStore.getContextData();
    expect(contextData.phaseInstructions).toEqual(mockData.phaseInstructions);
    expect(contextData.fileOperations).toEqual(mockData.fileOperations);
    expect(contextData.commandOperations).toEqual(mockData.commandOperations);
    expect(contextData.conversationHistory).toEqual(
      mockData.conversationHistory,
    );
    expect(contextData.systemInstructions).toEqual(mockData.systemInstructions);
  });

  it("should merge context data correctly", () => {
    const initialData = {
      phaseInstructions: new Map([
        ["phase1", { phase: "phase1", content: "instruction", timestamp: 123 }],
      ]),
      fileOperations: new Map<string, MessageFileOperation>([
        ["file1", { type: "read_file", path: "file1", timestamp: 456 }],
      ]),
      commandOperations: new Map<string, MessageCommandOperation>([
        [
          "command1",
          { type: "execute_command", command: "command1", timestamp: 789 },
        ],
      ]),
      conversationHistory: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
      systemInstructions: "system instruction",
    };
    messageContextStore.setContextData(initialData);

    const updatedData = {
      phaseInstructions: new Map(), // Should be explicitly cleared if not included
      fileOperations: new Map<string, MessageFileOperation>([
        ["file2", { type: "write_file", path: "file2", timestamp: 1000 }],
      ]),
      commandOperations: new Map<string, MessageCommandOperation>([
        [
          "command2",
          { type: "execute_command", command: "command2", timestamp: 1001 },
        ],
      ]),
      conversationHistory: [
        { role: "user", content: "hello 2" },
      ] as IConversationHistoryMessage[],
      systemInstructions: "system instruction 2",
    };

    messageContextStore.setContextData(updatedData);

    const mergedData = messageContextStore.getContextData();

    expect(mergedData.phaseInstructions).toEqual(updatedData.phaseInstructions);
    expect(mergedData.fileOperations).toEqual(updatedData.fileOperations);
    expect(mergedData.commandOperations).toEqual(updatedData.commandOperations);
    expect(mergedData.conversationHistory).toEqual(
      updatedData.conversationHistory,
    );
    expect(mergedData.systemInstructions).toEqual(
      updatedData.systemInstructions,
    );
  });

  it("should clear all context data", () => {
    messageContextStore.setContextData({
      phaseInstructions: new Map([
        ["phase1", { phase: "phase1", content: "instruction", timestamp: 123 }],
      ]),
      fileOperations: new Map<string, MessageFileOperation>([
        ["file1", { type: "read_file", path: "file1", timestamp: 456 }],
      ]),
      commandOperations: new Map<string, MessageCommandOperation>([
        [
          "command1",
          { type: "execute_command", command: "command1", timestamp: 789 },
        ],
      ]),
      conversationHistory: [
        { role: "user", content: "hello" },
      ] as IConversationHistoryMessage[],
      systemInstructions: "system instruction",
    });
    messageContextStore.clear();
    const contextData = messageContextStore.getContextData();
    expect(contextData.phaseInstructions.size).toBe(0);
    expect(contextData.fileOperations.size).toBe(0);
    expect(contextData.commandOperations.size).toBe(0);
    expect(contextData.conversationHistory).toEqual([]);
    expect(contextData.systemInstructions).toBeNull();
  });

  it("should correctly handle sequential and distinct operations", () => {
    // Initial write to file1
    messageContextStore.setContextData({
      fileOperations: new Map([
        [
          "file1",
          {
            type: "write_file",
            path: "file1",
            timestamp: 1,
            content: "content1",
          },
        ],
      ]),
    });

    let contextData = messageContextStore.getContextData();
    expect(contextData.fileOperations.size).toBe(1);
    expect(contextData.fileOperations.get("file1")?.content).toBe("content1");

    // Sequential write to file1, overwrites previous one
    messageContextStore.setContextData({
      fileOperations: new Map([
        [
          "file1",
          {
            type: "write_file",
            path: "file1",
            timestamp: 2,
            content: "content2",
          },
        ],
      ]),
    });
    contextData = messageContextStore.getContextData();
    expect(contextData.fileOperations.size).toBe(1);
    expect(contextData.fileOperations.get("file1")?.content).toBe("content2");

    // Write to a different file, should add a new entry
    messageContextStore.setContextData({
      fileOperations: new Map([
        [
          "file1",
          {
            type: "write_file",
            path: "file1",
            timestamp: 3,
            content: "content2",
          },
        ],
        [
          "file2",
          {
            type: "write_file",
            path: "file2",
            timestamp: 3,
            content: "content3",
          },
        ],
      ]),
    });
    contextData = messageContextStore.getContextData();
    expect(contextData.fileOperations.size).toBe(2);
    expect(contextData.fileOperations.get("file1")?.content).toBe("content2");
    expect(contextData.fileOperations.get("file2")?.content).toBe("content3");

    // Execute command to command1
    messageContextStore.setContextData({
      commandOperations: new Map([
        [
          "command1",
          {
            type: "execute_command",
            command: "command1",
            timestamp: 1,
            output: "output1",
          },
        ],
      ]),
    });
    contextData = messageContextStore.getContextData();
    expect(contextData.commandOperations.size).toBe(1);
    expect(contextData.commandOperations.get("command1")?.output).toBe(
      "output1",
    );

    // Sequential execute command to command1, overwrites previous one
    messageContextStore.setContextData({
      commandOperations: new Map([
        [
          "command1",
          {
            type: "execute_command",
            command: "command1",
            timestamp: 2,
            output: "output2",
          },
        ],
      ]),
    });
    contextData = messageContextStore.getContextData();
    expect(contextData.commandOperations.size).toBe(1);
    expect(contextData.commandOperations.get("command1")?.output).toBe(
      "output2",
    );

    // Execute a different command, should add a new entry
    messageContextStore.setContextData({
      commandOperations: new Map([
        [
          "command1",
          {
            type: "execute_command",
            command: "command1",
            timestamp: 3,
            output: "output2",
          },
        ],
        [
          "command2",
          {
            type: "execute_command",
            command: "command2",
            timestamp: 3,
            output: "output3",
          },
        ],
      ]),
    });
    contextData = messageContextStore.getContextData();
    expect(contextData.commandOperations.size).toBe(2);
    expect(contextData.commandOperations.get("command1")?.output).toBe(
      "output2",
    );
    expect(contextData.commandOperations.get("command2")?.output).toBe(
      "output3",
    );
  });

  it("should estimate token count correctly", () => {
    const text = "This is a test string.";
    const expectedTokenCount = Math.ceil(text.length / 4);
    expect(messageContextStore.estimateTokenCount(text)).toBe(
      expectedTokenCount,
    );
  });

  it("should calculate total token count correctly", () => {
    mocker
      .spyPrototype(MessageContextStore, "estimateTokenCount")
      //@ts-ignore
      .mockImplementation((text) => Math.ceil(text.length / 4));

    const mockData = {
      conversationHistory: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ] as IConversationHistoryMessage[],
      systemInstructions: "System instructions.",
    };
    messageContextStore.setContextData(mockData);

    const expectedTokenCount =
      Math.ceil("Hello".length / 4) +
      Math.ceil("Hi there!".length / 4) +
      Math.ceil("System instructions.".length / 4);
    expect(messageContextStore.getTotalTokenCount()).toBe(expectedTokenCount);
  });

  it("should calculate total token count correctly with no system instructions", () => {
    mocker
      .spyPrototype(MessageContextStore, "estimateTokenCount")
      //@ts-ignore
      .mockImplementation((text) => Math.ceil(text.length / 4));

    const mockData = {
      conversationHistory: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ] as IConversationHistoryMessage[],
      systemInstructions: null,
    };
    messageContextStore.setContextData(mockData);

    const expectedTokenCount =
      Math.ceil("Hello".length / 4) + Math.ceil("Hi there!".length / 4);
    expect(messageContextStore.getTotalTokenCount()).toBe(expectedTokenCount);
  });
});
