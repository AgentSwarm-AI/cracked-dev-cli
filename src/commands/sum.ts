import { Args, Command } from '@oclif/core';

export class Sum extends Command {
  static description = 'Sum two numbers';

  static args = {
    first: Args.string({
      description: 'First number',
      required: true,
    }),
    second: Args.string({
      description: 'Second number',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Sum);
    const first = Number(args.first);
    const second = Number(args.second);

    if (isNaN(first) || isNaN(second)) {
      this.error('Please provide valid numbers');
    }

    const result = first + second;
    this.log(`${first} + ${second} = ${result}`);
  }
}
