import { ConfigService } from "@services/ConfigService";
import { inject, singleton } from "tsyringe";
import { phaseBlueprints } from "./phases/blueprints";
import { IPhaseConfig, Phase } from "./types/PhaseTypes";

@singleton()
export class PhaseManager {
  private currentPhase: Phase = Phase.Discovery;
  private phaseConfigs: Map<Phase, IPhaseConfig> = new Map();

  constructor(@inject(ConfigService) private configService: ConfigService) {
    this.initializePhaseConfigs();
  }

  private initializePhaseConfigs() {
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
  }

  getCurrentPhase(): Phase {
    return this.currentPhase;
  }

  getCurrentPhaseConfig(): IPhaseConfig {
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
        // Execute is the final phase, stays there
        break;
    }
    return this.currentPhase;
  }

  resetPhase() {
    this.currentPhase = Phase.Discovery;
  }
}
