import { autoInjectable } from "tsyringe";
import { Colors } from "../constants/colors";

@autoInjectable()
export class DebugLogger {
  private debug: boolean = false;

  constructor() {}

  setDebug(debug: boolean) {
    this.debug = debug;
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
      if (typeof data === "object") {
        const jsonString = JSON.stringify(data, null, 2)
          .replace(/\\n/g, "\n")
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
        console.log(`${Colors.blue}${jsonString}${Colors.reset}`);
      } else {
        const formattedData = String(data).replace(/\\n/g, "\n");
        console.log(`${Colors.blue}  ${formattedData}${Colors.reset}`);
      }
      console.log(subDivider);
    }
  }
}
