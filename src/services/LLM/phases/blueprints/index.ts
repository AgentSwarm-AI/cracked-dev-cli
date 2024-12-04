import { Phase } from "../../types/PhaseTypes";
import { discoveryPhaseBlueprint } from "./discoveryPhaseBlueprint";
import { executePhaseBlueprint } from "./executePhaseBlueprint";
import { strategyPhaseBlueprint } from "./strategyPhaseBlueprint";

export const phaseBlueprints = {
  [Phase.Discovery]: discoveryPhaseBlueprint,
  [Phase.Strategy]: strategyPhaseBlueprint,
  [Phase.Execute]: executePhaseBlueprint,
};

export * from "./discoveryPhaseBlueprint";
export * from "./executePhaseBlueprint";
export * from "./strategyPhaseBlueprint";
