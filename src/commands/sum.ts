import { Args, Command } from "@oclif/core";
import { container } from "tsyringe";
import { Calculator } from "../services/Calculator.js";

export class Sum extends Command {
  static description = "Sum two numbers";

  static args = {
    first: Args.string({
      description: "First number",
      required: true,
    }),
    second: Args.string({
      description: "Second number",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Sum);
    const first = Number(args.first);
    const second = Number(args.second);

    if (isNaN(first) || isNaN(second)) {
      this.error("Please provide valid numbers");
    }

    const calculator = container.resolve(Calculator);
    const result = calculator.sum(first, second);
    this.log(`${first} + ${second} = ${result}`);
  }
}
