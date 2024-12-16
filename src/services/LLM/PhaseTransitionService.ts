import { injectable } from "tsyringe";
import { WriteActionData } from "./actions/types/ActionTypes";
import { MessageContextHistory } from "./context/MessageContextHistory";
import { MessageContextPhase } from "./context/MessageContextPhase";
import { ModelManager } from "./ModelManager";
import { PhaseManager } from "./PhaseManager";
import { Phase } from "./types/PhaseTypes";

@injectable()
export class PhaseTransitionService {
  constructor(
    private phaseManager: PhaseManager,
    private modelManager: ModelManager,
    private messageContextPhase: MessageContextPhase,
    private messageContextHistory: MessageContextHistory,
  ) {}

  async transitionToNextPhase(): Promise<WriteActionData> {
    const currentPhase = this.phaseManager.getCurrentPhase();

    this.messageContextPhase.cleanupPhaseContent();
    if (currentPhase === Phase.Strategy) {
      this.messageContextHistory.mergeConversationHistory();
    }
    const nextPhase = this.getNextPhase(currentPhase);

    // Log phase transition with emojis
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

    this.messageContextHistory.addMessage(
      "system",
      `Current phase is ${nextPhase}`,
    );

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
