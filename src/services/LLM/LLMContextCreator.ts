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
</environment_details>

ANSWER MUST ALWAYS BE OUTPUTTED IN THE FOLLOWING FORMAT:

<strategy>
To perform the task, I'll have to do the following:
- Do something on step 1
- Do something on step 2
- Then do something on step 3
- etc.
</strategy>

<next_step>
  I'll proceed with a <read_file>some/file/path/here</read_file> operation.
</next_step>


OTHER AVAILABLE TAGS (FYI):
<write_file>some/file/path/here</write_file>
<execute_command>some command here</execute_command>
<delete_file>some/file/path/here</delete_file>
<update_file>some/file/path/here</update_file>
<move_file>some/file/path/here</move_file>
<copy_file_slice>some/file/path/here</copy_file_slice>

EDITING FILE FOR CODE:

When editing file for code related actions, follow this format:

<edit_code_file>
  file_path: src/LLMContextCreator.ts
  range: lines 10-15
  replace_with: |
    // New code here
    console.log("Hello, world!");
   
  ###

  file_path: src/LLMContextCreator.ts
  range: lines 20-25
  replace_with: |
    // Another new code here
    console.log("Goodbye, world!");
    
</edit_code_file>
`;
  }
}
