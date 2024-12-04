import { inject, injectable } from "tsyringe";
import { WriteActionData } from "./actions/types/ActionTypes";
import { MessageContextManager } from "./MessageContextManager";
import { ModelManager } from "./ModelManager";
import { PhaseManager } from "./PhaseManager";

@injectable()
export class PhaseTransitionService {
  constructor(
    @inject(PhaseManager) private phaseManager: PhaseManager,
    @inject(ModelManager) private modelManager: ModelManager,
    @inject(MessageContextManager)
    private messageContextManager: MessageContextManager,
  ) {}

  async transitionToNextPhase(): Promise<WriteActionData> {
    // Clean up previous phase content
    this.messageContextManager.cleanupPhaseContent();

    // Move to next phase
    this.phaseManager.nextPhase();

    // Get the new phase's config
    const nextPhaseConfig = this.phaseManager.getCurrentPhaseConfig();

    // Update model for the new phase
    await this.modelManager.setCurrentModel(nextPhaseConfig.model);

    console.log(
      "Current history",
      this.messageContextManager.conversationHistory,
    );

    const prompt = nextPhaseConfig.generatePrompt({
      message: "Continue with the next phase based on previous findings.",
    });

    return {
      regenerate: true,
      prompt,
      selectedModel: nextPhaseConfig.model,
    };
  }
}
