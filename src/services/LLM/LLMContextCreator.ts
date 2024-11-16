import { autoInjectable } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";

export interface ILLMContext {
  task: string;
  environmentDetails: string;
}

@autoInjectable()
export class LLMContextCreator {
  constructor(private directoryScanner: DirectoryScanner) {}

  async create(message: string, root: string): Promise<string> {
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }

    const context: ILLMContext = {
      task: message,
      environmentDetails: `# Current Working Directory (${root}) Files\n${scanResult.data}`,
    };

    return this.format(context);
  }

  private format(context: ILLMContext): string {
    return `<task>
${context.task}
</task>

<environment_details>
${context.environmentDetails}
</environment_details>`;
  }
}
