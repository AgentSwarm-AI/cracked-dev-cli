import { DEFAULT_INSTRUCTIONS } from "@constants/defaultInstructions";
import { CrackedAgent } from "@services/CrackedAgent";
import { FileReader } from "@services/FileManagement/FileReader";
import { ActionsParser } from "@services/LLM/actions/ActionsParser";
import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { LLMProvider, LLMProviderType } from "@services/LLM/LLMProvider";
import { DebugLogger } from "@services/logging/DebugLogger";
import { StreamHandler } from "@services/streaming/StreamHandler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

jest.mock("@services/LLM/LLMProvider");

describe("CrackedAgent", () => {
  let crackedAgent: CrackedAgent;
  let mocker: UnitTestMocker;
  let mockLLMProvider: jest.Mocked<LLMProvider>;
  let mockActionsParser: jest.SpyInstance;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Create mock LLMProvider instance
    mockLLMProvider = {
      validateModel: jest.fn().mockResolvedValue(true),
      getAvailableModels: jest.fn().mockResolvedValue(["model1", "model2"]),
      sendMessage: jest.fn().mockResolvedValue("Mock response"),
      streamMessage: jest.fn().mockImplementation(async (_, __, callback) => {
        if (callback) await callback("Mock response");
      }),
      addSystemInstructions: jest.fn(),
      getConversationContext: jest.fn().mockReturnValue([]),
      clearConversationContext: jest.fn(),
    } as unknown as jest.Mocked<LLMProvider>;

    // Mock LLMProvider.getInstance to return our mock
    (LLMProvider.getInstance as jest.Mock).mockReturnValue(mockLLMProvider);

    // Mock FileReader methods
    mocker.spyOnPrototypeWithImplementation(
      FileReader,
      "readInstructionsFile",
      async () => "Mock instructions",
    );

    // Mock ActionsParser methods
    mockActionsParser = mocker.spyOnPrototypeWithImplementation(
      ActionsParser,
      "parseAndExecuteActions",
      (...args) => ({ actions: [], followupResponse: "" }),
    );

    // Mock LLMContextCreator methods
    mocker.spyOnPrototypeWithImplementation(
      LLMContextCreator,
      "create",
      async () => "Mock formatted message",
    );

    // Mock DebugLogger methods
    mocker.spyOnPrototypeWithImplementation(DebugLogger, "log", () => {});
    mocker.spyOnPrototypeWithImplementation(DebugLogger, "setDebug", () => {});

    // Mock StreamHandler methods
    mocker.spyOnPrototypeWithImplementation(StreamHandler, "reset", () => {});

    // Mock HtmlEntityDecoder methods
    mocker.spyOnPrototypeWithImplementation(
      HtmlEntityDecoder,
      "decode",
      () => "Mock decoded message",
    );

    // Resolve CrackedAgent from the container
    crackedAgent = container.resolve(CrackedAgent);
    // Set the llm instance using type assertion for private property access
    (crackedAgent as unknown as { llm: LLMProvider }).llm = mockLLMProvider;
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should handle instructions from instructionsPath", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructionsPath: "path/to/instructions",
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).toHaveBeenCalledWith(
        "path/to/instructions",
      );
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        "Mock instructions",
      );
    });

    it("should handle instructions from instructions", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructions: "Custom instructions",
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        "Custom instructions",
      );
    });

    it("should use default instructions if none provided", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);
      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        DEFAULT_INSTRUCTIONS,
      );
    });

    it("should clear conversation history if clearContext is true", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: true,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(mockLLMProvider.clearConversationContext).toHaveBeenCalled();
    });

    it("should enable streaming if stream is true", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: true,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(mockLLMProvider.streamMessage).toHaveBeenCalled();
    });

    it("should not enable streaming if stream is false", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(mockLLMProvider.sendMessage).toHaveBeenCalled();
      expect(mockLLMProvider.streamMessage).not.toHaveBeenCalled();
    });

    it("should enable debug logging if debug is true", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: true,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(DebugLogger.prototype.setDebug).toHaveBeenCalledWith(true);
    });

    it("should not enable debug logging if debug is false", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(DebugLogger.prototype.setDebug).toHaveBeenCalledWith(false);
    });

    it("should handle different providers", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("Mock message", options);

      expect(LLMProvider.getInstance).toHaveBeenCalledWith(
        LLMProviderType.OpenRouter,
      );
    });

    it("should handle root option", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        root: "/custom/root",
      };

      await crackedAgent.execute("Mock message", options);

      expect(LLMContextCreator.prototype.create).toHaveBeenCalledWith(
        "Mock message",
        "/custom/root",
        true,
      );
    });

    it("should handle options object", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        options: { key: "value" },
      };

      await crackedAgent.execute("Mock message", options);

      expect(mockLLMProvider.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        "Mock formatted message",
        { key: "value" },
      );
    });

    it("should handle empty message", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute("", options);

      expect(mockLLMProvider.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        "Mock formatted message",
        {},
      );
    });

    it("should handle null message", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
      };

      await crackedAgent.execute(undefined as unknown as string, options);

      expect(mockLLMProvider.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        "Mock formatted message",
        {},
      );
    });

    it("should handle empty instructionsPath", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructionsPath: "",
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        DEFAULT_INSTRUCTIONS,
      );
    });

    it("should handle null instructionsPath", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructionsPath: undefined as unknown as string,
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        DEFAULT_INSTRUCTIONS,
      );
    });

    it("should handle empty instructions", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructions: "",
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        DEFAULT_INSTRUCTIONS,
      );
    });

    it("should handle null instructions", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        instructions: undefined as unknown as string,
      };

      await crackedAgent.execute("Mock message", options);

      expect(FileReader.prototype.readInstructionsFile).not.toHaveBeenCalled();
      expect(mockLLMProvider.addSystemInstructions).toHaveBeenCalledWith(
        DEFAULT_INSTRUCTIONS,
      );
    });

    it("should handle empty options object", async () => {
      const options = {
        provider: LLMProviderType.OpenRouter,
        stream: false,
        debug: false,
        clearContext: false,
        autoScaler: false,
        options: {},
      };

      await crackedAgent.execute("Mock message", options);

      expect(mockLLMProvider.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        "Mock formatted message",
        {},
      );
    });
  });

  describe("getConversationHistory", () => {
    it("should return conversation history", () => {
      const history = crackedAgent.getConversationHistory();

      expect(history).toEqual([]);
      expect(mockLLMProvider.getConversationContext).toHaveBeenCalled();
    });
  });

  describe("clearConversationHistory", () => {
    it("should clear conversation history", () => {
      crackedAgent.clearConversationHistory();

      expect(mockLLMProvider.clearConversationContext).toHaveBeenCalled();
      expect(
        (crackedAgent as unknown as { isFirstInteraction: boolean })
          .isFirstInteraction,
      ).toBe(true);
    });
  });
});
