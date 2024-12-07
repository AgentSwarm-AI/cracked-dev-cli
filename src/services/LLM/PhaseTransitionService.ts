import { inject, injectable } from "tsyringe";
import { WriteActionData } from "./actions/types/ActionTypes";
import { MessageContextManager } from "./context/MessageContextManager";
import { ModelManager } from "./ModelManager";
import { PhaseManager } from "./PhaseManager";
import { Phase } from "./types/PhaseTypes";

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

    // If current phase is Strategy, merge conversation history before transitioning
    const currentPhase = this.phaseManager.getCurrentPhase();
    if (currentPhase === Phase.Strategy) {
      this.messageContextManager.mergeConversationHistory();
    }

    // Log phase transition with emojis
    const nextPhase = this.getNextPhase(currentPhase);
    console.log(
      `🔄 Phase Transition: ${this.getPhaseEmoji(currentPhase)}${currentPhase} ➡️ ${this.getPhaseEmoji(nextPhase)}${nextPhase}`,
    );

    // Move to next phase
    this.phaseManager.nextPhase();

    // Get the new phase's config
    const nextPhaseConfig = this.phaseManager.getCurrentPhaseConfig();

    // Update model for the new phase
    await this.modelManager.setCurrentModel(nextPhaseConfig.model);

    // Generate prompt but don't include it in the response
    nextPhaseConfig.generatePrompt({
      message: "Continue with the next phase based on previous findings.",
    });

    return {
      regenerate: true,
      selectedModel: nextPhaseConfig.model,
    };
  }

  private getNextPhase(currentPhase: Phase): Phase {
    switch (currentPhase) {
      case Phase.Discovery:
        return Phase.Strategy;
      case Phase.Strategy:
        return Phase.Execute;
      case Phase.Execute:
        return Phase.Discovery;
      default:
        return Phase.Discovery;
    }
  }

  private getPhaseEmoji(phase: Phase): string {
    switch (phase) {
      case Phase.Discovery:
        return "🔍 ";
      case Phase.Strategy:
        return "🎯 ";
      case Phase.Execute:
        return "⚡ ";
      default:
        return "❓ ";
    }
  }
}
