/* eslint-disable @typescript-eslint/ban-ts-comment */
import { MessageContextHistory } from "@/services/LLM/context/MessageContextHistory";
import { ModelManager } from "@/services/LLM/ModelManager";
import {
  LLMError,
  OpenRouterAPI,
} from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
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

  let addMessageSpy: jest.SpyInstance;

  const setupMocks = () => {
    // Message Context Manager mocks
    mocker.mockPrototypeWith(MessageContextHistory, "getMessages", () => []);
    mocker.mockPrototypeWith(MessageContextHistory, "addMessage", () => {});

    mocker.mockPrototypeWith(MessageContextHistory, "clear", () => {});
    mocker.mockPrototypeWith(
      MessageContextHistory,
      "setSystemInstructions",
      () => {},
    );

    // Other service mocks
    mocker.mockPrototypeWith(HtmlEntityDecoder, "decode", (str) => str);
    mocker.mockPrototypeWith(DebugLogger, "log", () => {});

    addMessageSpy = mocker.spyPrototype(MessageContextHistory, "addMessage");
  };

  beforeEach(() => {
    mocker = new UnitTestMocker();
    setupMocks();
    openRouterAPI = container.resolve(OpenRouterAPI);
    postSpy = jest.spyOn(openRouterAPI["httpClient"], "post");
    mocker.mockPrototypeWith(
      ModelManager,
      "getCurrentModel",
      () => "anthropic/claude-3-opus", // Fix model name consistency
    );
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
        expect(MessageContextHistory.prototype.addMessage).toHaveBeenCalledWith(
          "user",
          "Hi",
        );
        expect(MessageContextHistory.prototype.addMessage).toHaveBeenCalledWith(
          "assistant",
          "Hello!",
        );
      });

      it("should format messages with cache control for anthropic models with sufficient tokens", async () => {
        const longContent = "a".repeat(4500);
        await openRouterAPI.sendMessage("anthropic/claude-3-opus", longContent);

        expect(postSpy).toHaveBeenCalledWith(
          "/chat/completions",
          {
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
          },
          {
            headers: {
              "anthropic-beta": "prompt-caching-2024-07-31",
              "anthropic-version": "2023-06-01",
            },
          },
        );
      });

      it("should not add cache control for anthropic models with insufficient tokens", async () => {
        const shortContent = "test message";
        await openRouterAPI.sendMessage(
          "anthropic/claude-3-opus",
          shortContent,
        );

        expect(postSpy).toHaveBeenCalledWith(
          "/chat/completions",
          {
            model: "anthropic/claude-3-opus",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: shortContent,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "anthropic-beta": "prompt-caching-2024-07-31",
              "anthropic-version": "2023-06-01",
            },
          },
        );
      });

      it("should format messages without cache control for non-anthropic models", async () => {
        mocker.mockPrototypeWith(
          ModelManager,
          "getCurrentModel",
          () => "gpt-4",
        );

        await openRouterAPI.sendMessage("gpt-4", "test message");

        expect(postSpy).toHaveBeenCalledWith(
          "/chat/completions",
          {
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: "test message",
              },
            ],
          },
          {
            headers: {},
          },
        );
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
          MessageContextHistory.prototype.setSystemInstructions,
        ).toHaveBeenCalledWith("Be helpful");
      });
    });
  });

  describe("Conversation Context Management", () => {
    it("should clear conversation context", () => {
      openRouterAPI.clearConversationContext();
      expect(MessageContextHistory.prototype.clear).toHaveBeenCalled();
    });

    it("should get conversation context", () => {
      const messages = [{ role: "user", content: "Hi" }];
      mocker.mockPrototypeWith(
        MessageContextHistory,
        "getMessages",
        () => messages,
      );

      const context = openRouterAPI.getConversationContext();
      expect(context).toEqual(messages);
    });

    it("should add system instructions", () => {
      openRouterAPI.addSystemInstructions("Be helpful");
      expect(
        MessageContextHistory.prototype.setSystemInstructions,
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
  });
  describe("Streaming", () => {
    // beforeEach(() => {
    //   jest.useFakeTimers();
    // });

    // afterEach(() => {
    //   jest.useRealTimers();
    // });
    it("should handle streaming messages correctly", async () => {
      const mockStreamData = [
        'data: {"choices": [{"delta": {"content": "Hel"}}]}\n',
        'data: {"choices": [{"delta": {"content": "lo"}}]}\n',
        'data: {"choices": [{"delta": {"content": "!"}}]}\n',
        "data: [DONE]\n",
      ];

      const mockStream = new Readable({
        read() {
          mockStreamData.forEach((chunk) => {
            this.push(Buffer.from(chunk));
          });
          this.push(null);
        },
      });

      postSpy.mockResolvedValue({ data: mockStream });

      const callback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", callback);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, "Hel");
      expect(callback).toHaveBeenNthCalledWith(2, "lo");
      expect(callback).toHaveBeenNthCalledWith(3, "!");
    });

    it("should not add empty messages to context", async () => {
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from("data: [DONE]\n"));
          this.push(null);
        },
      });
      postSpy.mockResolvedValue({ data: mockStream });

      const callback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", callback);

      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("should handle errors within stream processing", async () => {
      const mockStreamData = [
        'data: {"error": {"message": "Stream error", "details": {}}}\n',
        "data: [DONE]\n",
      ];
      const mockStream = new Readable({
        read() {
          mockStreamData.forEach((chunk) => {
            this.push(Buffer.from(chunk));
          });
          this.push(null);
        },
      });
      postSpy.mockResolvedValue({ data: mockStream });
      const callback = jest.fn();

      await new Promise<void>((resolve) => {
        openRouterAPI.streamMessage("gpt-4", "Test message", (chunk, error) => {
          if (error) {
            expect(error).toBeInstanceOf(LLMError);
            expect(error.message).toEqual("Stream error");
            expect(error.type).toEqual("STREAM_ERROR");
            resolve();
          }
        });
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should not timeout when timeout is 0", async () => {
      const mockStreamData = [
        'data: {"choices": [{"delta": {"content": "Hel"}}]}\n',
        'data: {"choices": [{"delta": {"content": "lo"}}]}\n',
        'data: {"choices": [{"delta": {"content": "!"}}]}\n',
        "data: [DONE]\n",
      ];

      const mockStream = new Readable({
        read() {
          mockStreamData.forEach((chunk) => {
            this.push(Buffer.from(chunk));
          });
          this.push(null);
        },
      });

      postSpy.mockResolvedValue({ data: mockStream });
      openRouterAPI.updateTimeout(0); // No timeout

      const callback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", callback);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, "Hel");
      expect(callback).toHaveBeenNthCalledWith(2, "lo");
      expect(callback).toHaveBeenNthCalledWith(3, "!");
    });

    it("should handle aborted stream", async () => {
      const mockStreamData = [
        'data: {"choices": [{"delta": {"content": "Hel"}}]}\n',
        'data: {"choices": [{"delta": {"content": "lo"}}]}\n',
        'data: {"choices": [{"delta": {"content": "!"}}]}\n',
        "data: [DONE]\n",
      ];

      const mockStream = new Readable({
        read() {
          mockStreamData.forEach((chunk) => {
            this.push(Buffer.from(chunk));
          });
          this.push(null);
        },
      });

      postSpy.mockResolvedValue({ data: mockStream });

      const callback = jest.fn();
      const streamPromise = openRouterAPI.streamMessage(
        "gpt-4",
        "Hi",
        callback,
      );
      openRouterAPI.cancelStream();
      await streamPromise;

      expect(callback).toHaveBeenCalledWith(
        "",
        //@ts-ignore
        new LLMError("Aborted"),
      );
    });

    it("should retry on retryable error", async () => {
      const mockStreamData = [
        'data: {"choices": [{"delta": {"content": "Hel"}}]}\n',
        'data: {"choices": [{"delta": {"content": "lo"}}]}\n',
        'data: {"choices": [{"delta": {"content": "!"}}]}\n',
        "data: [DONE]\n",
      ];

      const mockStream = new Readable({
        read() {
          mockStreamData.forEach((chunk) => {
            this.push(Buffer.from(chunk));
          });
          this.push(null);
        },
      });

      postSpy
        .mockRejectedValueOnce(new LLMError("Network error", "NETWORK_ERROR"))
        .mockResolvedValue({ data: mockStream });

      const callback = jest.fn();
      await openRouterAPI.streamMessage("gpt-4", "Hi", callback);

      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable error", async () => {
      postSpy.mockRejectedValueOnce(
        new LLMError("Non retryable error", "API_ERROR"),
      );

      const callback = jest.fn();

      await new Promise<void>((resolve) => {
        openRouterAPI.streamMessage("gpt-4", "Hi", (chunk, error) => {
          if (error) {
            expect(error).toBeInstanceOf(LLMError);
            expect(error.message).toEqual("Non retryable error");
            expect(error.type).toEqual("API_ERROR");
            resolve();
          }
        });
      });
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Conversation History", () => {
    beforeEach(() => {
      mocker.mockPrototypeWith(ModelManager, "getCurrentModel", () => "gpt-4");
    });

    it("should maintain conversation history across multiple messages", async () => {
      const messages: IOpenRouterMessage[] = [];
      mocker.mockPrototypeWith(
        MessageContextHistory,
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

      expect(postSpy).toHaveBeenLastCalledWith(
        "/chat/completions",
        {
          model: "gpt-4",
          messages: [
            { role: "user", content: "First message" },
            { role: "assistant", content: "First response" },
            { role: "user", content: "Second message" },
          ],
        },
        {
          headers: {},
        },
      );
    });

    it("should handle system instructions in conversation context", async () => {
      const systemInstructions = "Be concise";
      const mockMessages: IOpenRouterMessage[] = [
        { role: "system", content: systemInstructions },
        { role: "user", content: "Previous message" },
        { role: "assistant", content: "Previous response" },
      ];

      mocker.mockPrototypeWith(
        MessageContextHistory,
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
        MessageContextHistory.prototype.setSystemInstructions,
      ).toHaveBeenCalledWith(systemInstructions);
      expect(postSpy).toHaveBeenCalledWith(
        "/chat/completions",
        {
          model: "gpt-4",
          messages: [...mockMessages, { role: "user", content: "New message" }],
        },
        {
          headers: {},
        },
      );
    });
  });

  describe("formatMessages", () => {
    it("should not create duplicate prompt_phase entries", async () => {
      const messages = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "How are you?" },
      ];

      // Access private method using any type
      const formattedMessages = (openRouterAPI as any).formatMessages(
        messages,
        "claude-3-opus-20240229",
      );

      formattedMessages.forEach((msg: { content: any[] }) => {
        if (Array.isArray(msg.content)) {
          const promptPhases = msg.content.filter(
            (item: any) => typeof item === "object" && "prompt_phase" in item,
          );
          const uniquePhases = new Set(
            promptPhases.map((p: { prompt_phase: any }) => p.prompt_phase),
          );
          expect(promptPhases.length).toBe(uniquePhases.size);
        }
      });
    });

    it("should correctly format messages for non-Anthropic models", async () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      const formattedMessages = (openRouterAPI as any).formatMessages(
        messages,
        "gpt-4",
      );

      formattedMessages.forEach((msg: { content: any }) => {
        expect(typeof msg.content).toBe("string");
      });
    });
  });
});
