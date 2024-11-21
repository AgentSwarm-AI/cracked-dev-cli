import { Colors } from "@constants/colors";
import { autoInjectable, singleton } from "tsyringe";

@singleton()
@autoInjectable()
export class DebugLogger {
  private debug: boolean = false;

  constructor() {}

  setDebug(debug: boolean) {
    this.debug = debug;
  }

  private formatData(data: any): string {
    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object") {
      try {
        return JSON.stringify(data, null, 2)
          .replace(/\\\\/g, "\\")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n");
      } catch {
        return String(data);
      }
    }

    return String(data);
  }

  log(type: string, message: string, data?: any) {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    const divider = "\n" + "═".repeat(100);
    const subDivider = "─".repeat(80);

    console.log(divider);
    console.log(`${Colors.cyan}DEBUG${Colors.reset} [${timestamp}]`);
    console.log(`${Colors.yellow}${type}${Colors.reset}: ${message}`);

    if (data) {
      console.log(`\n${Colors.magenta}Data:${Colors.reset}`);
      const formattedData = this.formatData(data)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      console.log(`${Colors.blue}${formattedData}${Colors.reset}`);
      console.log(subDivider);
    }
  }
}
