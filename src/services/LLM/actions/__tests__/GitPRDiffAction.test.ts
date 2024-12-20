import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { ConfigService } from "@/services/ConfigService";
import { GitService } from "@/services/GitManagement/GitService";
import { container } from "tsyringe";
import { GitPRDiffAction } from "../GitPRDiffAction";

describe("GitPRDiffAction", () => {
  let gitPRDiffAction: GitPRDiffAction;
  let mocker: UnitTestMocker;
  let consoleWarnSpy: jest.SpyInstance;

  beforeAll(() => {
    gitPRDiffAction = container.resolve(GitPRDiffAction);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
    mocker.mockPrototype(ConfigService, "getConfig", {
      gitDiff: {
        excludeLockFiles: false,
        lockFiles: [],
      },
    });
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    mocker.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  it("should get PR diff with valid parameters", async () => {
    const mockDiff = "mock PR diff content";
    const getPRDiffSpy = mocker.mockPrototype(
      GitService,
      "getPRDiff",
      Promise.resolve(mockDiff),
    );

    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch>main</baseBranch>
        <compareBranch>feature-branch</compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockDiff);
    expect(getPRDiffSpy).toHaveBeenCalledWith("main", "feature-branch", "");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should get PR diff and warn when excludeLockFiles is true", async () => {
    const mockDiff = "mock PR diff content";
    const getPRDiffSpy = mocker.mockPrototype(
      GitService,
      "getPRDiff",
      Promise.resolve(mockDiff),
    );

    mocker.mockPrototype(ConfigService, "getConfig", {
      gitDiff: {
        excludeLockFiles: true,
        lockFiles: ["package-lock.json", "yarn.lock"],
      },
    });

    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch>main</baseBranch>
        <compareBranch>feature-branch</compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockDiff);
    expect(getPRDiffSpy).toHaveBeenCalledWith(
      "main",
      "feature-branch",
      ":!package-lock.json :!yarn.lock",
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: File exclusion patterns are not supported for PR diffs. The pattern will be ignored.",
    );
  });

  it("should fail with invalid baseBranch", async () => {
    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch></baseBranch>
        <compareBranch>feature-branch</compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "baseBranch is required and must be a non-empty string",
    );
  });

  it("should fail with invalid compareBranch", async () => {
    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch>main</baseBranch>
        <compareBranch></compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "compareBranch is required and must be a non-empty string",
    );
  });

  it("should handle malformed XML content", async () => {
    const result = await gitPRDiffAction.execute("<git_pr_diff>"); // Missing closing tag

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain(
      "Failed to parse git PR diff content",
    );
  });

  it("should handle git service errors", async () => {
    const error = new Error("Git error");
    mocker.mockPrototype(GitService, "getPRDiff", Promise.reject(error));

    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch>main</baseBranch>
        <compareBranch>feature-branch</compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  it("should handle whitespace in branch names", async () => {
    const mockDiff = "mock PR diff content";
    const getPRDiffSpy = mocker.mockPrototype(
      GitService,
      "getPRDiff",
      Promise.resolve(mockDiff),
    );

    const result = await gitPRDiffAction.execute(`
      <git_pr_diff>
        <baseBranch>  main  </baseBranch>
        <compareBranch>  feature/branch  </compareBranch>
      </git_pr_diff>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockDiff);
    expect(getPRDiffSpy).toHaveBeenCalledWith("main", "feature/branch", "");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
