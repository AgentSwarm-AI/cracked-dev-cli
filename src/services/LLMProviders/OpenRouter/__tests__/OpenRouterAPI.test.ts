import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import { DebugLogger } from "@services/logging/DebugLogger";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { Readable } from "stream";
import { container } from "tsyringe";
import { IOpenRouterMessage } from "../types/OpenRouterAPITypes";

describe("OpenRouterAPI", () => {
  let openRouterAPI: OpenRouterAPI;
  let mocker: UnitTestMocker;
  let postSpy: jest.SpyInstance;

  const setupMocks = () => {
    // Message Context Manager mocks
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

    // Model Info mocks
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

    // Model Scaler mocks
    mocker.spyOnPrototypeWithImplementation(
      ModelScaler,
      "getCurrentModel",
      () => null,
    );
    mocker.spyOnPrototypeWithImplementation(ModelScaler, "reset", () => {});

    // Other service mocks
    mocker.spyOnPrototypeWithImplementation(
      HtmlEntityDecoder,
      "decode",
      (str) => str,
    );
    mocker.spyOnPrototypeWithImplementation(DebugLogger, "log", () => {});
  };

  beforeEach(() => {
    mocker = new UnitTestMocker();
    setupMocks();
    openRouterAPI = container.resolve(OpenRouterAPI);
    postSpy = jest.spyOn(openRouterAPI["httpClient"], "post");
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("Message Handling", () => {
    describe("sendMessage", () => {
      const mockSuccessResponse = {
        data: {
          choices: [{ message: { content: "Hello!" } }],
        },
      };

      beforeEach(() => {
        postSpy.mockResolvedValue(mockSuccessResponse);
      });

      it("should send a message and handle the response", async () => {
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
        await openRouterAPI.sendMessage("anthropic/claude-3-opus", longContent);

        expect(postSpy).toHaveBeenCalledWith("/chat/completions", {
          model: "anthropic/claude-3-opus",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: longContent,
                  cache_control: { type: "ephemeral" },
                },
              ],
            },
          ],
        });
      });

      it("should format messages without cache control for non-anthropic models", async () => {
        await openRouterAPI.sendMessage("gpt-4", "test message");

        expect(postSpy).toHaveBeenCalledWith("/chat/completions", {
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: "test message",
            },
          ],
        });
      });

      it("should handle API errors appropriately", async () => {
        postSpy.mockRejectedValueOnce({
          response: {
            data: {
              error: { message: "Test error" },
            },
          },
        });

        await expect(openRouterAPI.sendMessage("gpt-4", "Hi")).rejects.toThrow(
          "Test error",
        );
      });
    });

    describe("sendMessageWithContext", () => {
      it("should send a message with system instructions", async () => {
        postSpy.mockResolvedValueOnce({
          data: { choices: [{ message: { content: "Hello!" } }] },
        });

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
  });

  describe("Conversation Context Management", () => {
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

  describe("Model Management", () => {
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

  describe("Streaming", () => {
    it("should handle streaming messages", async () => {
      const mockStream = new Readable({
        read() {
          this.push(
            Buffer.from(
              'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            ),
          );
          this.push(
            Buffer.from('data: {"choices":[{"delta":{"content":"!"}}]}\n\n'),
          );
          this.push(Buffer.from("data: [DONE]\n\n"));
          this.push(null);
        },
      });

      postSpy.mockResolvedValueOnce({ data: mockStream });

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

  describe("Conversation History", () => {
    it("should maintain conversation history across multiple messages", async () => {
      const messages: IOpenRouterMessage[] = [];
      mocker.spyOnPrototypeWithImplementation(
        MessageContextManager,
        "getMessages",
        () => messages,
      );

      postSpy
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: "First response" } }] },
        })
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: "Second response" } }] },
        });

      await openRouterAPI.sendMessage("gpt-4", "First message");
      messages.push(
        { role: "user", content: "First message" },
        { role: "assistant", content: "First response" },
      );

      await openRouterAPI.sendMessage("gpt-4", "Second message");

      expect(postSpy).toHaveBeenLastCalledWith("/chat/completions", {
        model: "gpt-4",
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
          { role: "user", content: "Second message" },
        ],
      });
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
      postSpy.mockResolvedValueOnce({
        data: { choices: [{ message: { content: "Concise response" } }] },
      });

      await openRouterAPI.sendMessageWithContext(
        "gpt-4",
        "New message",
        systemInstructions,
      );

      expect(
        MessageContextManager.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith(systemInstructions);
      expect(postSpy).toHaveBeenCalledWith("/chat/completions", {
        model: "gpt-4",
        messages: [...mockMessages, { role: "user", content: "New message" }],
      });
    });
  });
});
