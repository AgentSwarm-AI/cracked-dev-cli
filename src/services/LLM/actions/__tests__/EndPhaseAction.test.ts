import { EndPhaseAction } from "@services/LLM/actions/EndPhaseAction";
import { PhaseTransitionService } from "@services/LLM/PhaseTransitionService";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import { container } from "tsyringe";
import { endPhaseActionBlueprint } from "../blueprints/endPhaseActionBlueprint";
import { ActionPriority } from "../types/ActionPriority";

describe("EndPhaseAction", () => {
  let endPhaseAction: EndPhaseAction;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();
    endPhaseAction = container.resolve(EndPhaseAction);
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  describe("action execution", () => {
    it("should execute phase transition successfully", async () => {
      const transitionResult = {
        regenerate: true,
        prompt: "test prompt",
        selectedModel: "test-model",
      };

      mocker.mockPrototype(
        PhaseTransitionService,
        "transitionToNextPhase",
        transitionResult,
      );

      const result = await endPhaseAction.execute("<end_phase></end_phase>");

      expect(result).toEqual({
        success: true,
        data: transitionResult,
      });
    });

    it("should handle transition errors", async () => {
      const error = new Error("Transition failed");

      mocker.mockPrototypeWith(
        PhaseTransitionService,
        "transitionToNextPhase",
        () => Promise.reject(error),
      );

      const result = await endPhaseAction.execute("<end_phase></end_phase>");

      expect(result).toEqual({
        success: false,
        error: error,
      });
    });
  });

  describe("action configuration", () => {
    it("should have correct priority in blueprint", () => {
      expect(endPhaseActionBlueprint.priority).toBe(ActionPriority.CRITICAL);
    });

    it("should have correct tag in blueprint", () => {
      expect(endPhaseActionBlueprint.tag).toBe("end_phase");
    });

    it("should require processing", () => {
      expect(endPhaseActionBlueprint.requiresProcessing).toBe(true);
    });
  });
});
