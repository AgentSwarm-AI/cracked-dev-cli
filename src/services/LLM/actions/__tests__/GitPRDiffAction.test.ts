import { GitService } from "@/services/GitManagement/GitService";
import { DebugLogger } from "@/services/logging/DebugLogger";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { GitPRDiffAction } from "../GitPRDiffAction";

describe("GitPRDiffAction", () => {
  let action: GitPRDiffAction;
  let mockGitService: jest.Mocked<GitService>;

  beforeEach(() => {
    mockGitService = {
      getPRDiff: jest.fn(),
    } as any;

    action = new GitPRDiffAction(
      new ActionTagsExtractor(),
      mockGitService,
      new DebugLogger(),
    );
  });

  it("should get PR diff with valid parameters", async () => {
    mockGitService.getPRDiff.mockResolvedValue("mock PR diff content");

    const result = await action.execute(
      JSON.stringify({ baseBranch: "main", compareBranch: "feature-branch" }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("mock PR diff content");
    expect(mockGitService.getPRDiff).toHaveBeenCalledWith(
      "main",
      "feature-branch",
    );
  });

  it("should fail with invalid baseBranch", async () => {
    await expect(
      action.execute(
        JSON.stringify({ baseBranch: "", compareBranch: "feature-branch" }),
      ),
    ).rejects.toBe("baseBranch is required and must be a non-empty string");
  });

  it("should fail with invalid compareBranch", async () => {
    await expect(
      action.execute(JSON.stringify({ baseBranch: "main", compareBranch: "" })),
    ).rejects.toBe("compareBranch is required and must be a non-empty string");
  });

  it("should fail with invalid JSON content", async () => {
    await expect(action.execute("invalid JSON")).rejects.toBe(
      "Invalid JSON content",
    );
  });
});
