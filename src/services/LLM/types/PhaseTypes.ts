export enum Phase {
  Discovery = "discovery",
  Strategy = "strategy",
  Execute = "execute",
}

export interface IPhasePromptArgs {
  message: string;
  environmentDetails?: string;
  projectInfo?: string;
  [key: string]: any;
}

export interface IPhaseConfig {
  model: string;
  generatePrompt: (args: IPhasePromptArgs) => string;
}

export interface IPhaseManagerConfig {
  discoveryModel: string;
  strategyModel: string;
  executeModel: string;
}
