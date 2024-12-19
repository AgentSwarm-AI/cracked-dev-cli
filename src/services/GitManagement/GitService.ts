import simpleGit, {
  DefaultLogFields,
  LogResult,
  SimpleGit,
  StatusResult,
} from "simple-git";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async getDiff(filepath?: string): Promise<string> {
    return filepath
      ? await this.git.diff(["--", filepath])
      : await this.git.diff();
  }

  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }

  async getPRDiff(baseBranch: string, compareBranch: string): Promise<string> {
    return await this.git.diff([`${baseBranch}...${compareBranch}`]);
  }

  async getFileHistory(filepath: string): Promise<string> {
    const logResult: LogResult<DefaultLogFields> = await this.git.log([
      "--follow",
      "--",
      filepath,
    ]);
    return JSON.stringify(logResult, null, 2);
  }

  async getCurrentBranch(): Promise<string> {
    return (await this.git.branch()).current;
  }
}
