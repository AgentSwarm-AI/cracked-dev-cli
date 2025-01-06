// services/PhaseManager.ts
import { ConfigService } from "@services/ConfigService";
import { injectable, singleton } from "tsyringe";
import { ModelManager } from "./ModelManager";
import { phaseBlueprints } from "./phases/blueprints";
import { IPhaseConfig, Phase } from "./types/PhaseTypes";

@injectable()
@singleton()
export class PhaseManager {
  private currentPhase: Phase = Phase.Discovery;
  private phaseConfigs: Map<Phase, IPhaseConfig> = new Map();

  constructor(
    private configService: ConfigService,
    private modelManager: ModelManager,
  ) {}

  public initializePhaseConfigs() {
    const config = this.configService.getConfig();

    // Initialize configs using blueprints but override models from config if provided
    this.phaseConfigs = new Map([
      [
        Phase.Discovery,
        {
          ...phaseBlueprints[Phase.Discovery],
          model:
            config.discoveryModel || phaseBlueprints[Phase.Discovery].model,
        },
      ],
      [
        Phase.Strategy,
        {
          ...phaseBlueprints[Phase.Strategy],
          model: config.strategyModel || phaseBlueprints[Phase.Strategy].model,
        },
      ],
      [
        Phase.Execute,
        {
          ...phaseBlueprints[Phase.Execute],
          model: config.executeModel || phaseBlueprints[Phase.Execute].model,
        },
      ],
    ]);

    // set initial phase
    this.currentPhase = Phase.Discovery;

    // set initial model
    const phaseData = this.phaseConfigs.get(Phase.Discovery);

    if (!phaseData) {
      throw new Error("No data found for Discovery phase");
    }

    this.modelManager.setCurrentModel(phaseData.model);
  }

  getCurrentPhase(): Phase {
    return this.currentPhase;
  }

  getCurrentPhaseConfig(): IPhaseConfig {
    // reset if not set
    if (!this.currentPhase) {
      this.resetPhase();
    }

    const config = this.phaseConfigs.get(this.currentPhase);
    if (!config) {
      throw new Error(`No configuration found for phase ${this.currentPhase}`);
    }
    return config;
  }

  setPhase(phase: Phase) {
    this.currentPhase = phase;
  }

  getPhaseConfig(phase: Phase): IPhaseConfig {
    const config = this.phaseConfigs.get(phase);
    if (!config) {
      throw new Error(`No configuration found for phase ${phase}`);
    }
    return config;
  }

  nextPhase(): Phase {
    switch (this.currentPhase) {
      case Phase.Discovery:
        this.currentPhase = Phase.Strategy;
        break;
      case Phase.Strategy:
        this.currentPhase = Phase.Execute;
        break;
      case Phase.Execute:
        // Execute is the final phase, return current phase
        return this.currentPhase;
    }
    return this.currentPhase;
  }

  resetPhase() {
    this.currentPhase = Phase.Discovery;
  }
}
