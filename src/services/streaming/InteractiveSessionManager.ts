import { CrackedAgent } from "@services/CrackedAgent";
import { OpenRouterAPI } from "@services/LLMProviders/OpenRouter/OpenRouterAPI";
import * as readline from "readline";
import { singleton } from "tsyringe";
import * as tty from "tty";

@singleton()
export class InteractiveSessionManager {
  private currentMessage: string = "";
  private keypressHandler: ((buffer: Buffer) => void) | null = null;
  private lineHandler: ((input: string) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private rl: readline.Interface | null = null;
  private agent: CrackedAgent | null = null;
  private options: any = null;

  constructor(private openRouterAPI: OpenRouterAPI) {}

  public initialize(rl: readline.Interface, agent: CrackedAgent, options: any) {
    this.rl = rl;
    this.agent = agent;
    this.options = options;
    this.openRouterAPI.updateTimeout(this.options.timeout);
  }

  private setupKeypressHandling() {
    if (!this.rl) return;

    if (process.stdin instanceof tty.ReadStream) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      this.keypressHandler = async (buffer: Buffer) => {
        const key = buffer.toString();
        if (key === "\u001B") {
          // Escape key
          this.openRouterAPI.cancelStream();
          console.log("\nStreaming cancelled.");
          await this.restartSession();
        }
      };

      process.stdin.on("data", this.keypressHandler);
    }
  }

  private async restartSession() {
    if (!this.rl) return;

    console.log("Please type your new prompt and press enter...");
    this.rl.prompt();

    // If we have a current message, restart with it
    if (this.currentMessage) {
      await this.handleInput(this.currentMessage);
    } else {
      // Otherwise, prompt for new input
      this.rl.prompt();
    }
  }

  private async handleInput(input: string) {
    if (!this.rl || !this.agent || !this.options) return;

    if (input.toLowerCase() === "exit") {
      console.log("Goodbye!");
      this.cleanup();
      process.exit(0);
    }

    this.currentMessage = input;

    try {
      const result = await this.agent.execute(input, this.options);
      if (!this.options.stream && result) {
        console.log("\nResponse:", result.response);
        if (result.actions?.length) {
          console.log("\nExecuted Actions:");
          result.actions.forEach(({ action, result }) => {
            console.log(`\nAction: ${action}`);
            console.log(`Result: ${JSON.stringify(result, null, 2)}`);
          });
        }
      }
    } catch (error) {
      console.error("Error:", (error as Error).message);
    }

    this.rl.prompt();
  }

  public async start() {
    if (!this.rl) return;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleTimeout = () => {
      console.error(
        `Operation timed out after ${this.options.timeout / 1000} seconds`,
      );
      this.cleanup();
      process.exit(1);
    };

    console.log(
      'Interactive mode started. Type "exit" or press Ctrl+C to quit.',
    );

    this.setupKeypressHandling();
    this.rl.prompt();

    this.lineHandler = async (input: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      await this.handleInput(input);
      if (this.options.timeout > 0) {
        timeoutId = setTimeout(handleTimeout, this.options.timeout);
      }
    };

    this.closeHandler = () => {
      if (timeoutId) clearTimeout(timeoutId);
      this.cleanup();
      process.exit(0);
    };

    this.rl.on("line", this.lineHandler);
    this.rl.on("close", this.closeHandler);
  }

  public cleanup() {
    if (this.keypressHandler && process.stdin instanceof tty.ReadStream) {
      process.stdin.removeListener("data", this.keypressHandler);
      process.stdin.setRawMode(false);
    }

    if (this.lineHandler && this.rl) {
      this.rl.removeListener("line", this.lineHandler);
    }

    if (this.closeHandler && this.rl) {
      this.rl.removeListener("close", this.closeHandler);
    }

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    this.agent = null;
    this.options = null;
  }
}
