import { Command } from "@oclif/core";
import { ConfigService } from "../services/ConfigService";

export default class Init extends Command {
  static description = "Initialize a default crkdrc.json configuration file";

  static examples = ["$ crkd init"];

  async run(): Promise<void> {
    ConfigService.createDefaultConfig();
  }
}
