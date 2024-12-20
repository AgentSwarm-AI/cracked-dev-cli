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

  async getDiff(
    fromCommit: string,
    toCommit: string,
    excludePattern?: string,
  ): Promise<string> {
    const args = [];

    // Add the commit range
    args.push(fromCommit);
    args.push(toCommit);

    // Add exclude patterns if any
    if (excludePattern) {
      args.push(...excludePattern.split(" "));
    }

    return await this.git.diff(args);
  }

  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }

  async getPRDiff(
    baseBranch: string,
    compareBranch: string,
    excludePattern?: string,
  ): Promise<string> {
    const args = [];

    // Add the branch range
    args.push(baseBranch);
    args.push(compareBranch);

    // Add exclude patterns if any
    if (excludePattern) {
      args.push(...excludePattern.split(" "));
    }

    return await this.git.diff(args);
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
