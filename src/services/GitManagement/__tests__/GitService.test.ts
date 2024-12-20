import simpleGit, { SimpleGit } from "simple-git";
import { GitService } from "../GitService";

jest.mock("simple-git");

describe("GitService", () => {
  let gitService: GitService;
  let mockedSimpleGit: jest.MockedFunction<typeof simpleGit>;
  let mockedGit: jest.Mocked<SimpleGit>;

  beforeEach(() => {
    mockedSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;
    mockedGit = {
      diff: jest.fn(),
      status: jest.fn(),
      log: jest.fn(),
      branch: jest.fn(),
    } as unknown as jest.Mocked<SimpleGit>;
    mockedSimpleGit.mockReturnValue(mockedGit);
    gitService = new GitService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDiff", () => {
    it("should get the diff between two commits", async () => {
      mockedGit.diff.mockResolvedValue("test diff");
      const diff = await gitService.getDiff("HEAD^", "HEAD");
      expect(diff).toBe("test diff");
      expect(mockedGit.diff).toHaveBeenCalledWith(["HEAD^", "HEAD"]);
    });

    it("should get the diff between two commits with exclude pattern", async () => {
      mockedGit.diff.mockResolvedValue("test diff");
      const diff = await gitService.getDiff(
        "HEAD^",
        "HEAD",
        ":!package-lock.json :!yarn.lock",
      );
      expect(diff).toBe("test diff");
      expect(mockedGit.diff).toHaveBeenCalledWith([
        "HEAD^",
        "HEAD",
        ":!package-lock.json",
        ":!yarn.lock",
      ]);
    });
  });

  it("should get the status", async () => {
    const mockStatus = {
      not_added: [],
      conflicted: [],
      created: [],
      deleted: [],
      modified: [],
      renamed: [],
      files: [],
      staged: [],
      ahead: 0,
      behind: 0,
      current: "main",
      tracking: "origin/main",
      detached: false,
      isClean: () => true,
    };
    mockedGit.status.mockResolvedValue(mockStatus);
    const status = await gitService.getStatus();
    expect(status).toEqual(mockStatus);
    expect(mockedGit.status).toHaveBeenCalled();
  });

  describe("getPRDiff", () => {
    it("should get the PR diff without exclude pattern", async () => {
      mockedGit.diff.mockResolvedValue("pr diff");
      const diff = await gitService.getPRDiff("main", "feature");
      expect(diff).toBe("pr diff");
      expect(mockedGit.diff).toHaveBeenCalledWith(["main", "feature"]);
    });

    it("should get the PR diff with exclude pattern", async () => {
      mockedGit.diff.mockResolvedValue("pr diff");
      const diff = await gitService.getPRDiff(
        "main",
        "feature",
        ":!package-lock.json :!yarn.lock",
      );
      expect(diff).toBe("pr diff");
      expect(mockedGit.diff).toHaveBeenCalledWith([
        "main",
        "feature",
        ":!package-lock.json",
        ":!yarn.lock",
      ]);
    });
  });

  it("should get the file history", async () => {
    const mockLog = {
      all: [],
      latest: null,
      total: 0,
    };
    mockedGit.log.mockResolvedValue(mockLog);
    const history = await gitService.getFileHistory("test.txt");
    expect(history).toBe(JSON.stringify(mockLog, null, 2));
    expect(mockedGit.log).toHaveBeenCalledWith(["--follow", "--", "test.txt"]);
  });

  it("should get the current branch", async () => {
    mockedGit.branch.mockResolvedValue({
      current: "main",
      all: [],
      detached: false,
      branches: {},
    });
    const branch = await gitService.getCurrentBranch();
    expect(branch).toBe("main");
    expect(mockedGit.branch).toHaveBeenCalled();
  });
});
