import { MessageContextManager } from "@services/LLM/context/MessageContextManager";
import { ModelManager } from "@services/LLM/ModelManager";
import { PhaseManager } from "@services/LLM/PhaseManager";
import { PhaseTransitionService } from "@services/LLM/PhaseTransitionService";
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

    phaseManagerMock = mocker.mockPrototype(
      PhaseManager,
      "nextPhase",
      undefined,
    );

    mocker.mockPrototype(PhaseManager, "getCurrentPhaseConfig", {
      model: "test-model",
      generatePrompt: (data: { message: string }) => `Prompt: ${data.message}`,
    });

    modelManagerMock = mocker.mockPrototype(
      ModelManager,
      "setCurrentModel",
      undefined,
    );

    messageContextManagerMock = mocker.mockPrototype(
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
});
