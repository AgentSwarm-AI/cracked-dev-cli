import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { IOpenRouterMessage } from "../types/OpenRouterAPITypes";
import { Readable } from "stream";

describe("OpenRouterAPI", () => {
  let openRouterAPI: OpenRouterAPI;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "getMessages",
      () => [],
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "addMessage",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "clear",
      () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      MessageContextManager,
      "setSystemInstructions",
      () => {},
    );

    mocker.spyOnPrototypeWithImplementation(
      ModelInfo,
      "initialize",
      async () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      ModelInfo,
      "setCurrentModel",
      async () => {},
    );
    mocker.spyOnPrototypeWithImplementation(
      ModelInfo,
      "isModelAvailable",
      async () => true,
    );
    mocker.spyOnPrototypeWithImplementation(
      ModelInfo,
      "getAllModels",
      async () => ["gpt-4"],
    );

    mocker.spyOnPrototypeWithImplementation(
      ModelScaler,
      "getCurrentModel",
      () => null,
    );
    mocker.spyOnPrototypeWithImplementation(ModelScaler, "reset", () => {});
    mocker.spyOnPrototypeWithImplementation(
      HtmlEntityDecoder,
      "decode",
      (str) => str,
    );

    mocker.spyOnPrototypeWithImplementation(DebugLogger, "log", () => {});

    openRouterAPI = container.resolve(OpenRouterAPI);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should send a message and handle the response", async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Hello!" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      const response = await openRouterAPI.sendMessage("gpt-4", "Hi");

      expect(response).toBe("Hello!");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "Hi",
      );
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hello!",
      );
    });

    it("should format messages with cache control for anthropic models with long content", async () => {
      const longContent = "a".repeat(1001);
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Response" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      await openRouterAPI.sendMessage("anthropic/claude-3-opus", longContent);

      const expectedPayload = {
        model: "anthropic/claude-3-opus",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: longContent,
                cache_control: {
                  type: "ephemeral",
                },
              },
            ],
          },
        ],
      };

      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });

    it("should format messages without cache control for non-anthropic models", async () => {
      const content = "test message";
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Response" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      await openRouterAPI.sendMessage("gpt-4", content);

      const expectedPayload = {
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
      };

      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });

    it("should handle errors appropriately", async () => {
      const error = {
        response: {
          data: {
            error: {
              message: "Test error",
            },
          },
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockRejectedValueOnce(error);

      await expect(openRouterAPI.sendMessage("gpt-4", "Hi")).rejects.toThrow(
        "Test error",
      );
    });
  });

  describe("sendMessageWithContext", () => {
    it("should send a message with system instructions", async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: "Hello!" } }],
        },
      };

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      const response = await openRouterAPI.sendMessageWithContext(
        "gpt-4",
        "Hi",
        "Be helpful",
      );

      expect(response).toBe("Hello!");
      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith("Be helpful");
    });
  });

  describe("conversation context management", () => {
    it("should clear conversation context", () => {
      openRouterAPI.clearConversationContext();
      expect(MessageContextManager.prototype.clear).toHaveBeenCalled();
      expect(ModelScaler.prototype.reset).toHaveBeenCalled();
    });

    it("should get conversation context", () => {
      const messages = [{ role: "user", content: "Hi" }];
      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => messages,
      );

      const context = openRouterAPI.getConversationContext();
      expect(context).toEqual(messages);
    });

    it("should add system instructions", () => {
      openRouterAPI.addSystemInstructions("Be helpful");
      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith("Be helpful");
    });
  });

  describe("model management", () => {
    it("should get available models", async () => {
      const models = await openRouterAPI.getAvailableModels();
      expect(models).toEqual(["gpt-4"]);
    });

    it("should validate model", async () => {
      const isValid = await openRouterAPI.validateModel("gpt-4");
      expect(isValid).toBe(true);
    });

    it("should get model info", async () => {
      const mockModelInfo = { id: "gpt-4", context_length: 8192 };
      mocker.spyOnPrototypeWithImplementation(
        ModelInfo,
        "getModelInfo",
        async () => mockModelInfo,
      );

      const modelInfo = await openRouterAPI.getModelInfo("gpt-4");
      expect(modelInfo).toEqual(mockModelInfo);
    });
  });

  describe("streaming", () => {
    it("should handle streaming messages", async () => {
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          this.push(Buffer.from('data: {"choices":[{"delta":{"content":"!"}}]}\n\n'));
          this.push(Buffer.from("data: [DONE]\n\n"));
          this.push(null);
        }
      });

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      jest.spyOn(openRouterAPI["httpClient"], "post").mockResolvedValueOnce({
        data: mockStream
      });

      const mockCallback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", mockCallback);

      expect(mockCallback).toHaveBeenCalledWith("Hello");
      expect(mockCallback).toHaveBeenCalledWith("!");
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "user",
        "Hi",
      );
      expect(MessageContextManager.prototype.addMessage).toHaveBeenCalledWith(
        "assistant",
        "Hello!",
      );
    });
  });

  describe("prompt caching", () => {
    it("should reuse conversation context for subsequent messages", async () => {
      const mockMessages: IOpenRouterMessage[] = [
        { role: "user", content: "Initial message" },
        { role: "assistant", content: "Initial response" },
      ];

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => mockMessages,
      );

      const mockResponse = {
        data: {
          choices: [{ message: { content: "Follow-up response" } }],
        },
      };

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      await openRouterAPI.sendMessage("gpt-4", "Follow-up message");

      const expectedPayload = {
        model: "gpt-4",
        messages: [
          ...mockMessages,
          { role: "user", content: "Follow-up message" },
        ],
      };

      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });

    it("should maintain conversation history across multiple messages", async () => {
      const messages: IOpenRouterMessage[] = [];
      const messageContextSpy = mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => messages,
      );

      const mockResponses = [
        { data: { choices: [{ message: { content: "First response" } }] } },
        { data: { choices: [{ message: { content: "Second response" } }] } },
      ];

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      // First message
      await openRouterAPI.sendMessage("gpt-4", "First message");
      messages.push(
        { role: "user", content: "First message" },
        { role: "assistant", content: "First response" },
      );

      // Second message
      await openRouterAPI.sendMessage("gpt-4", "Second message");

      const expectedPayload = {
        model: "gpt-4",
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
          { role: "user", content: "Second message" },
        ],
      };

      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(postSpy).toHaveBeenLastCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });

    it("should clear conversation history when requested", async () => {
      const mockMessages: IOpenRouterMessage[] = [
        { role: "user", content: "Previous message" },
        { role: "assistant", content: "Previous response" },
      ];

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => mockMessages,
      );

      const mockResponse = {
        data: {
          choices: [{ message: { content: "New response" } }],
        },
      };

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      // Clear conversation
      openRouterAPI.clearConversationContext();

      // Reset mock to return empty messages after clear
      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => [],
      );

      await openRouterAPI.sendMessage("gpt-4", "New message");

      const expectedPayload = {
        model: "gpt-4",
        messages: [{ role: "user", content: "New message" }],
      };

      expect(MessageContextManager.prototype.clear).toHaveBeenCalled();
      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });

    it("should handle system instructions in conversation context", async () => {
      const systemInstructions = "Be concise";
      const mockMessages: IOpenRouterMessage[] = [
        { role: "system", content: systemInstructions },
        { role: "user", content: "Previous message" },
        { role: "assistant", content: "Previous response" },
      ];

      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => mockMessages,
      );

      const mockResponse = {
        data: {
          choices: [{ message: { content: "Concise response" } }],
        },
      };

      const postSpy = jest
        .spyOn(openRouterAPI["httpClient"], "post")
        .mockResolvedValueOnce(mockResponse);

      await openRouterAPI.sendMessageWithContext(
        "gpt-4",
        "New message",
        systemInstructions,
      );

      const expectedPayload = {
        model: "gpt-4",
        messages: [...mockMessages, { role: "user", content: "New message" }],
      };

      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith(systemInstructions);
      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        expectedPayload,
      );
    });
  });
});