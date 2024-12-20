import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { ConfigService } from "@/services/ConfigService";
import { GitService } from "@/services/GitManagement/GitService";
import { container } from "tsyringe";
import { GitDiffAction } from "../GitDiffAction";

describe("GitDiffAction", () => {
  let gitDiffAction: GitDiffAction;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    gitDiffAction = container.resolve(GitDiffAction);
  });

  beforeEach(() => {
    mocker = new UnitTestMocker();
    mocker.mockPrototype(ConfigService, "getConfig", {
      gitDiff: {
        excludeLockFiles: false,
        lockFiles: [],
      },
    });
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should get diff between commits", async () => {
    const mockDiff = "mock diff content";
    const getDiffSpy = mocker.mockPrototype(
      GitService,
      "getDiff",
      Promise.resolve(mockDiff),
    );

    const result = await gitDiffAction.execute(`
      <git_diff>
        <fromCommit>HEAD^</fromCommit>
        <toCommit>HEAD</toCommit>
      </git_diff>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockDiff);
    expect(getDiffSpy).toHaveBeenCalledWith("HEAD^", "HEAD", "");
  });

  it("should get diff with exclude pattern when excludeLockFiles is true", async () => {
    const mockDiff = "mock diff content";
    const getDiffSpy = mocker.mockPrototype(
      GitService,
      "getDiff",
      Promise.resolve(mockDiff),
    );

    mocker.mockPrototype(ConfigService, "getConfig", {
      gitDiff: {
        excludeLockFiles: true,
        lockFiles: ["package-lock.json", "yarn.lock"],
      },
    });

    const result = await gitDiffAction.execute(`
      <git_diff>
        <fromCommit>HEAD^</fromCommit>
        <toCommit>HEAD</toCommit>
      </git_diff>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockDiff);
    expect(getDiffSpy).toHaveBeenCalledWith(
      "HEAD^",
      "HEAD",
      ":!package-lock.json :!yarn.lock",
    );
  });

  it("should handle missing fromCommit", async () => {
    const mockDiff = "mock diff content";
    const getDiffSpy = mocker.mockPrototype(
      GitService,
      "getDiff",
      Promise.resolve(mockDiff),
    );

    const result = await gitDiffAction.execute(`
      <git_diff>
        <toCommit>HEAD</toCommit>
      </git_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "fromCommit is required and must be a non-empty string",
    );
    expect(getDiffSpy).not.toHaveBeenCalled();
  });

  it("should handle missing toCommit", async () => {
    const mockDiff = "mock diff content";
    const getDiffSpy = mocker.mockPrototype(
      GitService,
      "getDiff",
      Promise.resolve(mockDiff),
    );

    const result = await gitDiffAction.execute(`
      <git_diff>
        <fromCommit>HEAD^</fromCommit>
      </git_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "toCommit is required and must be a non-empty string",
    );
    expect(getDiffSpy).not.toHaveBeenCalled();
  });

  it("should handle git service errors", async () => {
    const error = new Error("Git error");
    mocker.mockPrototype(GitService, "getDiff", Promise.reject(error));

    const result = await gitDiffAction.execute(`
      <git_diff>
        <fromCommit>HEAD^</fromCommit>
        <toCommit>HEAD</toCommit>
      </git_diff>
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  it("should handle malformed XML content", async () => {
    const result = await gitDiffAction.execute("<git_diff>"); // Missing closing tag

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Failed to parse git diff content");
  });
});
