import { PhaseTransitionService } from "@services/LLM/PhaseTransitionService";
import { PhaseManager } from "@services/LLM/PhaseManager";
import { ModelManager } from "@services/LLM/ModelManager";
import { MessageContextManager } from "@services/LLM/MessageContextManager";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";

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

    mocker.spyOnPrototypeAndReturn(
      PhaseManager,
      "getCurrentPhaseConfig",
      {
        model: "test-model",
        generatePrompt: (data: { message: string }) => `Prompt: ${data.message}`,
      },
    );

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

    it("should generate prompt based on the new phase's config", async () => {
      const result = await phaseTransitionService.transitionToNextPhase();

      expect(result.prompt).toBe("Prompt: Continue with the next phase based on previous findings.");
    });

    it("should return correct WriteActionData", async () => {
      const result = await phaseTransitionService.transitionToNextPhase();

      expect(result).toEqual({
        regenerate: true,
        prompt: "Prompt: Continue with the next phase based on previous findings.",
        selectedModel: "test-model",
      });
    });
  });
});