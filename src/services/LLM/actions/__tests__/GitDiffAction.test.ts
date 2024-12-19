import { GitService } from "@/services/GitManagement/GitService";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { GitDiffAction } from "../GitDiffAction";

describe("GitDiffAction", () => {
  let action: GitDiffAction;
  let mockGitService: jest.Mocked<GitService>;

  beforeEach(() => {
    mockGitService = {
      getDiff: jest.fn(),
    } as any;

    action = new GitDiffAction(
      new ActionTagsExtractor(),
      mockGitService,
      new DebugLogger(),
    );
  });

  it("should get diff for specific file", async () => {
    mockGitService.getDiff.mockResolvedValue("mock diff content");

    const result = await action.execute(
      "<git_diff><path>src/index.ts</path></git_diff>",
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("mock diff content");
    expect(mockGitService.getDiff).toHaveBeenCalledWith("src/index.ts");
  });

  it("should get diff for full repository when no path is provided", async () => {
    mockGitService.getDiff.mockResolvedValue("mock full repo diff content");

    const result = await action.execute("<git_diff></git_diff>");

    expect(result.success).toBe(true);
    expect(result.data).toBe("mock full repo diff content");
    expect(mockGitService.getDiff).toHaveBeenCalledWith(undefined);
  });
});
