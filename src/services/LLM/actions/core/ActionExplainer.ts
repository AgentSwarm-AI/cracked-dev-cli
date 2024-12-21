import { autoInjectable } from "tsyringe";
import { ActionFactory } from "./ActionFactory";
import { IActionBlueprint, IActionParameter } from "./IAction";

@autoInjectable()
export class ActionExplainer {
  constructor(private actionFactory: ActionFactory) {}

  explainAction(actionTag: string): string {
    const blueprint = this.actionFactory.getBlueprint(actionTag);
    if (!blueprint) {
      return `Action ${actionTag} not found.`;
    }

    return this.formatActionExplanation(blueprint);
  }

  explainAllActions(): string {
    const blueprints = this.actionFactory.getAllBlueprints();
    return blueprints
      .map((blueprint) => this.formatActionExplanation(blueprint))
      .join("\n\n");
  }

  private formatActionExplanation(blueprint: IActionBlueprint): string {
    let explanation = `<${blueprint.tag}> ${blueprint.description}\n`;

    if (blueprint.parameters && blueprint.parameters.length > 0) {
      explanation += "\nParameters:\n";
      explanation += this.formatParameters(blueprint.parameters);
    }

    explanation += "\nUsage:\n";
    explanation += blueprint.usageExplanation;

    return explanation;
  }

  private formatParameters(parameters: IActionParameter[]): string {
    return parameters
      .map(
        (param) =>
          `- ${param.name}${param.required ? " (required)" : " (optional)"}: ${
            param.description
          }`,
      )
      .join("\n");
  }
}
