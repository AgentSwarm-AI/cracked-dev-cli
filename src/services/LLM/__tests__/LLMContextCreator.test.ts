import { ConfigService } from "@services/ConfigService";
import { DirectoryScanner } from "@services/FileManagement/DirectoryScanner";
import { ActionExecutor } from "@services/LLM/actions/ActionExecutor";
import { LLMContextCreator } from "@services/LLM/LLMContextCreator";
import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import { container } from "tsyringe";
import { UnitTestMocker } from "../../../jest/mocks/UnitTestMocker";

describe("LLMContextCreator", () => {
  let contextCreator: LLMContextCreator;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;
  let mockProjectInfo: jest.Mocked<ProjectInfo>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();
    mockDirectoryScanner = container.resolve(
      DirectoryScanner,
    ) as jest.Mocked<DirectoryScanner>;
    mockActionExecutor = container.resolve(
      ActionExecutor,
    ) as jest.Mocked<ActionExecutor>;
    mockProjectInfo = container.resolve(
      ProjectInfo,
    ) as jest.Mocked<ProjectInfo>;
    mockConfigService = container.resolve(
      ConfigService,
    ) as jest.Mocked<ConfigService>;

    mocker.spyOnPrototypeMethod(DirectoryScanner, "scan");
    mocker.spyOnPrototypeMethod(ActionExecutor, "executeAction");
    mocker.spyOnPrototypeMethod(ProjectInfo, "gatherProjectInfo");
    mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
      includeAllFilesOnEnvToContext: true,
    });

    contextCreator = container.resolve(LLMContextCreator);
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

      mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", scanResult);
      mocker.spyOnPrototypeAndReturn(
        ProjectInfo,
        "gatherProjectInfo",
        projectInfoResult,
      );

      const result = await contextCreator.create(message, root, true);

      // Test for presence of key content rather than exact matches
      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).toContain("Instructions");
      expect(result).toContain("Current Working Directory");
      expect(result).toContain(scanResult.data);
      expect(result).toContain("Project Dependencies");
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

      mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", scanResult);
      mocker.spyOnPrototypeAndReturn(
        ProjectInfo,
        "gatherProjectInfo",
        projectInfoResult,
      );

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).toContain("Instructions");
      expect(result).toContain("Current Working Directory");
      expect(result).toContain(scanResult.data);
      expect(result).not.toContain("Project Dependencies");
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
      expect(mockProjectInfo.gatherProjectInfo).toHaveBeenCalledWith(root);
    });

    it("should create sequential message with phase prompt", async () => {
      const message = "test message";
      const root = "/test/root";

      const result = await contextCreator.create(message, root, false);

      // Verify the phase prompt structure without checking for the message
      expect(result).toContain("phase_prompt");
      expect(result).toContain("Discovery Phase");
      expect(result).toContain("Actions");
      expect(mockDirectoryScanner.scan).not.toHaveBeenCalled();
      expect(mockProjectInfo.gatherProjectInfo).not.toHaveBeenCalled();
    });

    it("should throw error if directory scan fails", async () => {
      const message = "test message";
      const root = "/test/root";
      const error = new Error("Scan failed");

      mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", {
        success: false,
        error,
      });

      await expect(contextCreator.create(message, root, true)).rejects.toThrow(
        "Failed to scan directory",
      );
    });

    it("should not include environment details when config flag is false", async () => {
      const message = "test message";
      const root = "/test/root";
      const scanResult = {
        success: true,
        data: "file1\nfile2",
      };
      const projectInfoResult = {
        mainDependencies: ["dep1"],
        scripts: { test: "jest" },
        dependencyFile: "package.json",
      };

      mocker.spyOnPrototypeAndReturn(ConfigService, "getConfig", {
        includeAllFilesOnEnvToContext: false,
      });
      mocker.spyOnPrototypeAndReturn(DirectoryScanner, "scan", scanResult);
      mocker.spyOnPrototypeAndReturn(
        ProjectInfo,
        "gatherProjectInfo",
        projectInfoResult,
      );

      const result = await contextCreator.create(message, root, true);

      expect(result).toContain("Task");
      expect(result).toContain(message);
      expect(result).not.toContain(scanResult.data);
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(root);
    });
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });
});
