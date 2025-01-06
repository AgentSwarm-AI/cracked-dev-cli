import { ConfigService } from "@services/ConfigService";
import { container } from "tsyringe";
import { IPhaseConfig, IPhasePromptArgs } from "../../types/PhaseTypes";

const configService = container.resolve(ConfigService);
const config = configService.getConfig();

export const executePhaseBlueprint: IPhaseConfig = {
  model: config.executeModel,
  generatePrompt: (args: IPhasePromptArgs) => `
<phase_prompt>
<!-- These are internal instructions. Just follow them. Do not output. -->

## Execute Phase

## Critical Instructions
- Don't be lazy.
- Follows existing coding patterns and architectural conventions to ensure seamless integration of new changes.
- Ensures that all modifications adhere to strict typing and coding standards to maintain code quality.
- ONE action per response
- Full code only, no skipped lines
- Avoid installing new deps. Confirm with the user first if needed. Aim to use project dependencies.
- VERY IMPORTANT: Include code snippets ONLY within <write_file> tags. Do not use Markdown formatting such as triple backticks. Only use plain text or <write_file> tags to encapsulate code.
- Do not get stuck running tests or type checks over and over. After this action, try a solution with write_file.

## Before coding
- Each task begins with a clear directive, such as "Change this...", "I'll help you...", or "Let me check...".
- Before making changes, read_file on relevant files to understand existing implementations and dependencies.
- Identify and assess dependencies that may be affected by the changes, ensuring comprehensive updates.

## During coding
- Make changes in the codebase
- Only create extra files if absolutely necessary. Try exploring codebase with available actions.
- Tasks often target specific files and their corresponding test files, if any.
- Each task should be broken down into sequential steps, ensuring thorough and methodical changes.
- Ensure that new changes maintain compatibility with existing functionalities, preventing regressions.
- Focus on the minimum required changes to achieve the goal. Do not remove a ton of code. 
- Only output full code. No partial code with "skip" comments.

## Example of how to behave

You want to [rephrase task], such as renaming [existingField] to [newField] and adding [newFunctionality] to the system, while [ensuring tests are updated to reflect these changes - if any]. I'll proceed step by step to ensure everything works seamlessly.

{if exploration still needed despite current context: 
  Ok, let me do an extra digging first...

  [read_file, search_string, search_file, relative_path_lookup, list_directory_files, read_directory]

}

[List steps here]

Ok, let's start the [step number] step [step name].

Let's start by applying some changes to [file name]. 

[write_file]

<!-- Then verify the changes you did -->
[runOneFileTypeCheckCmd]

<!-- Run test for file, if any -->
[runOneTestCmd]

{if tests were found, fix if broken or create new cases to cover new functionality

  Ok, now let me update the tests for [file name].

  [write_file]
}

(Do the same for each step)

...

(Once finished all tasks are completed...)

Ok, changes are done. I'll run the tests to verify everything works as expected.

[runAllFilesTypeCheckCmd]
[runAllTestsCmd]

Ok, all tests and checks passed. Let me summarize the changes and end the task.

[summarize_changes]

[end_task]

## What if you get stuck?

- If there are too many issues with a file and you feel hopeless, try rolling back changes and starting over. 
  <execute_command>
    git checkout -- <file_name_here>
  </execute_command>

- If stuck with import issues, try relative_path_lookup to find the file you need.

- Ask the user for help.


## Example of HOW NOT TO BEHAVE

- Here's the code:
\`\`\`typescript
some code here 
\`\`\`

### Do this instead!

- Here's the code:
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
    <!-- Full code. -->
  </content>
</write_file>

## Commands
- Run specific test: ${args.runOneTestCmd || "yarn jest {relativeTestPath}"}
- Run all tests: ${args.runAllTestsCmd || "yarn jest"}
- Type check (all files): ${args.runAllFilesTypeCheckCmd || "yarn tsc --noEmit --skipLibCheck"}
- Type check (single file): ${args.runOneFileTypeCheckCmd || "yarn tsc {filePath} --noEmit --skipLibCheck"}

## Available Actions
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
    <!-- Full code, raw text -->
  </content>
</write_file>

<list_directory_files>
 <!-- One or more paths -->
  <path>path/here</path>
  <path>path/here/2</path>
  <recursive>false</recursive>
  <!-- Use this action to list all files in a directory. Set recursive to true if you want to list files recursively. -->
</list_directory_files>

<read_file>
  <path>path/here</path>
</read_file>

<execute_command>
  <!-- Any command -->
</execute_command>


<execute_command>
  <!-- Any command like "ls -la" or "yarn install" -->
  <!-- Use project's package manager, no new deps unless allowed -->
  <!-- Avoid git commands, prefer git_diff/git_pr_diff -->
</execute_command>

<search_string>
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<relative_path_lookup>
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>
</relative_path_lookup>

<delete_file>
  <path>/path/here</path>
</delete_file>

<move_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</move_file>

<copy_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>  
</copy_file>

<read_directory>
  <!-- This reads all files in a directory. -->
  <!-- One or more paths -->
  <path>directory/path</path>
  <path>directory/path/2</path>
</read_directory>

<action_explainer>
  <action>
    <!-- git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>


<end_task>
  <!-- Remember you can only finish after running all tests and type checks, and its passing -->
  <!-- Add a summary of your changes here, in a list format -->
</end_task>

${args.projectInfo ? `\n## Project Context\n${args.projectInfo}` : ""}
</phase_prompt>
`,
};
