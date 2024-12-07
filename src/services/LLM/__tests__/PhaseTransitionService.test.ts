import { ConfigService } from "@services/ConfigService";
import { MessageContextManager } from "@services/LLM/context/MessageContextManager";
import { MessageConversationLogger } from "@services/LLM/context/MessageConversationLogger";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { ModelManager } from "@services/LLM/ModelManager";
import { PhaseManager } from "@services/LLM/PhaseManager";
import { PhaseTransitionService } from "@services/LLM/PhaseTransitionService";
import { DebugLogger } from "@services/logging/DebugLogger";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { Phase } from "../types/PhaseTypes";
import { AnthropicCaching } from "../utils/AnthropicCaching";

describe("PhaseTransitionService", () => {
  let phaseTransitionService: PhaseTransitionService;
  let mocker: UnitTestMocker;
  let phaseManagerMock: jest.SpyInstance;
  let modelManagerMock: jest.SpyInstance;
  let messageContextManagerMock: jest.SpyInstance;

  beforeAll(() => {
    phaseTransitionService = container.resolve(PhaseTransitionService);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();

    phaseManagerMock = mocker.spyOnPrototypeAndReturn(
      PhaseManager,
      "nextPhase",
      undefined,
    );

    mocker.spyOnPrototypeAndReturn(PhaseManager, "getCurrentPhaseConfig", {
      model: "test-model",
      generatePrompt: (data: { message: string }) => `Prompt: ${data.message}`,
    });

    modelManagerMock = mocker.spyOnPrototypeAndReturn(
      ModelManager,
      "setCurrentModel",
      undefined,
    );

    messageContextManagerMock = mocker.spyOnPrototypeAndReturn(
      MessageContextManager,
      "cleanupPhaseContent",
      undefined,
    );
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
  });

  describe("transitionToNextPhase", () => {
    it("should clean up previous phase content", async () => {
      await phaseTransitionService.transitionToNextPhase();

      expect(messageContextManagerMock).toHaveBeenCalled();
    });

    it("should move to the next phase", async () => {
      await phaseTransitionService.transitionToNextPhase();

      expect(phaseManagerMock).toHaveBeenCalled();
    });

    it("should get the new phase's config", async () => {
      await phaseTransitionService.transitionToNextPhase();

      expect(phaseManagerMock).toHaveBeenCalled();
    });

    it("should update model for the new phase", async () => {
      await phaseTransitionService.transitionToNextPhase();

      expect(modelManagerMock).toHaveBeenCalledWith("test-model");
    });

    it("should return correct WriteActionData", async () => {
      const result = await phaseTransitionService.transitionToNextPhase();

      expect(result).toEqual({
        regenerate: true,
        selectedModel: "test-model",
      });
    });
  });

  describe("Integration: Phase Transition and Message Context", () => {
    let messageContextManager: MessageContextManager;
    let phaseManager: PhaseManager;
    let anthropicCaching: AnthropicCaching;

    beforeEach(() => {
      // Set up real instances
      const debugLogger = container.resolve(DebugLogger);
      const modelInfo = container.resolve(ModelInfo);
      const configService = container.resolve(ConfigService);
      const conversationLogger = container.resolve(MessageConversationLogger);

      messageContextManager = new MessageContextManager(
        debugLogger,
        modelInfo,
        configService,
        conversationLogger,
      );
      anthropicCaching = container.resolve(AnthropicCaching);
      phaseManager = container.resolve(PhaseManager);

      // Create service with real instances
      container.registerInstance(MessageContextManager, messageContextManager);
      container.registerInstance(PhaseManager, phaseManager);
      phaseTransitionService = container.resolve(PhaseTransitionService);
    });

    it("should not merge conversation history when transitioning from Discovery to Strategy", async () => {
      // Mock getCurrentPhase to return Discovery
      jest
        .spyOn(phaseManager, "getCurrentPhase")
        .mockReturnValue(Phase.Discovery);
      jest.spyOn(phaseManager, "getCurrentPhaseConfig").mockReturnValue({
        model: "test-model",
        generatePrompt: (data: { message: string }) =>
          `Prompt: ${data.message}`,
      });

      // Set up initial conversation history
      messageContextManager.addMessage("user", "First message");
      messageContextManager.addMessage("assistant", "Second message");

      const initialMessages = messageContextManager.getMessages();
      expect(initialMessages.length).toBe(2);

      await phaseTransitionService.transitionToNextPhase();

      const finalMessages = messageContextManager.getMessages();
      expect(finalMessages.length).toBe(2);
      expect(finalMessages).toEqual([
        { role: "user", content: "First message" },
        { role: "assistant", content: "Second message" },
      ]);
    });

    it("should merge conversation history when transitioning from Strategy to Execute", async () => {
      // Mock getCurrentPhase to return Strategy
      jest
        .spyOn(phaseManager, "getCurrentPhase")
        .mockReturnValue(Phase.Strategy);
      jest.spyOn(phaseManager, "getCurrentPhaseConfig").mockReturnValue({
        model: "test-model",
        generatePrompt: (data: { message: string }) =>
          `Prompt: ${data.message}`,
      });

      // Set up initial conversation history
      messageContextManager.addMessage("user", "First message");
      messageContextManager.addMessage("assistant", "Second message");

      const initialMessages = messageContextManager.getMessages();
      expect(initialMessages.length).toBe(2);

      await phaseTransitionService.transitionToNextPhase();

      const finalMessages = messageContextManager.getMessages();
      expect(finalMessages.length).toBe(1);
      expect(finalMessages[0]).toEqual({
        role: "assistant",
        content: "user: First message\n\nassistant: Second message",
      });
    });

    it("should properly handle Anthropic caching during Strategy to Execute transition", async () => {
      // Mock getCurrentPhase to return Strategy
      jest
        .spyOn(phaseManager, "getCurrentPhase")
        .mockReturnValue(Phase.Strategy);
      jest.spyOn(phaseManager, "getCurrentPhaseConfig").mockReturnValue({
        model: "test-model",
        generatePrompt: (data: { message: string }) =>
          `Prompt: ${data.message}`,
      });

      // Set Anthropic model
      const model = "anthropic/claude-3-opus";
      messageContextManager.setCurrentModel(model);

      // Create a large message that should trigger caching
      const largeMessage = "a".repeat(5000); // Over 1000 tokens
      expect(anthropicCaching.isAnthropicModel(model)).toBe(true);
      expect(anthropicCaching.shouldUseCache(largeMessage)).toBe(true);

      // Add message to context
      messageContextManager.addMessage("assistant", largeMessage);

      // Transition to Execute phase
      await phaseTransitionService.transitionToNextPhase();

      // Verify conversation was merged
      const messages = messageContextManager.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toContain(largeMessage);

      // Add new message and verify caching would still be applied
      const newMessage = "b".repeat(5000);
      expect(anthropicCaching.shouldUseCache(newMessage)).toBe(true);
    });
  });
});
