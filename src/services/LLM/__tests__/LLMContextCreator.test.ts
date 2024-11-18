import { container } from "tsyringe";
import { DirectoryScanner } from "../../FileManagement/DirectoryScanner";
import { ActionExecutor } from "../actions/ActionExecutor";
import { LLMContextCreator } from "../LLMContextCreator";
import { ProjectInfo } from "../utils/ProjectInfo";

jest.mock("../../FileManagement/DirectoryScanner");
jest.mock("../actions/ActionExecutor");
jest.mock("../utils/ProjectInfo");

describe("LLMContextCreator", () => {
  let contextCreator: LLMContextCreator;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;
  let mockProjectInfo: jest.Mocked<ProjectInfo>;

  beforeEach(() => {
    mockDirectoryScanner = container.resolve(
      DirectoryScanner,
    ) as jest.Mocked<DirectoryScanner>;
    mockActionExecutor = container.resolve(
      ActionExecutor,
    ) as jest.Mocked<ActionExecutor>;
    mockProjectInfo = container.resolve(
      ProjectInfo,
    ) as jest.Mocked<ProjectInfo>;
    contextCreator = new LLMContextCreator(
      mockDirectoryScanner,
      mockActionExecutor,
      mockProjectInfo,
    );
  });

  describe("create", () => {
    it("should create first time message with environment details and project info", async () => {
      const message = "test message";
      const root = "/test/root";
      const scanResult = {
        success: true,
        data: "file1\nfile2",
      };
      const projectInfoResult = {
        mainDependencies: ["dep1", "dep2"],
        scripts: {
          test: "jest",
          build: "tsc",
        },
        dependencyFile: "package.json",
      };

      mockDirectoryScanner.scan.mockResolvedValue(scanResult);
      mockProjectInfo.gatherProjectInfo.mockResolvedValue(projectInfoResult);

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("<task>");
      expect(result).toContain(message);
      expect(result).toContain("<environment>");
      expect(result).toContain(scanResult.data);
      expect(result).toContain("Project Dependencies (from package.json)");
      expect(result).toContain("dep1, dep2");
      expect(result).toContain("test: jest");
      expect(result).toContain("build: tsc");
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(mockProjectInfo.gatherProjectInfo).toHaveBeenCalledWith(root);
    });

    it("should create first time message without project info if no dependency file found", async () => {
      const message = "test message";
      const root = "/test/root";
      const scanResult = {
        success: true,
        data: "file1\nfile2",
      };
      const projectInfoResult = {
        mainDependencies: [],
        scripts: {},
      };

      mockDirectoryScanner.scan.mockResolvedValue(scanResult);
      mockProjectInfo.gatherProjectInfo.mockResolvedValue(projectInfoResult);

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("<task>");
      expect(result).toContain(message);
      expect(result).toContain("<environment>");
      expect(result).toContain(scanResult.data);
      expect(result).not.toContain("Project Dependencies");
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(mockProjectInfo.gatherProjectInfo).toHaveBeenCalledWith(root);
    });

    it("should create sequential message without environment details", async () => {
      const message = "test message";
      const root = "/test/root";

      const result = await contextCreator.create(message, root, false);

      expect(result).toBe(message);
      expect(mockDirectoryScanner.scan).not.toHaveBeenCalled();
      expect(mockProjectInfo.gatherProjectInfo).not.toHaveBeenCalled();
    });

    it("should throw error if directory scan fails", async () => {
      const message = "test message";
      const root = "/test/root";
      const error = new Error("Scan failed");

      mockDirectoryScanner.scan.mockResolvedValue({
        success: false,
        error,
      });

      await expect(contextCreator.create(message, root, true)).rejects.toThrow(
        "Failed to scan directory",
      );
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should parse and execute all actions in text", async () => {
      const text = `
        <read_file><path>test1.txt</path></read_file>
        <write_file><path>test2.txt</path><content>test</content></write_file>
      `;
      const mockResults = [
        { success: true, data: "content1" },
        { success: true },
      ];

      mockActionExecutor.executeAction
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const results = await contextCreator.parseAndExecuteActions(text);

      expect(results).toHaveLength(2);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(2);
      expect(results[0].result).toBe(mockResults[0]);
      expect(results[1].result).toBe(mockResults[1]);
    });

    it("should handle text with no actions", async () => {
      const text = "no actions here";
      const results = await contextCreator.parseAndExecuteActions(text);
      expect(results).toHaveLength(0);
      expect(mockActionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it("should handle nested tags in actions", async () => {
      const text = `
        <write_file>
          <path>test.txt</path>
          <content>
            <nested>content</nested>
          </content>
        </write_file>
      `;
      const mockResult = { success: true };
      mockActionExecutor.executeAction.mockResolvedValue(mockResult);

      const results = await contextCreator.parseAndExecuteActions(text);

      expect(results).toHaveLength(1);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(1);
      expect(results[0].result).toBe(mockResult);
    });
  });
});
