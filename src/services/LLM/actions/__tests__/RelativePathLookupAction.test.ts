import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { RelativePathLookupAction } from "@services/LLM/actions/RelativePathLookupAction";
import { UnitTestMocker } from "@tests/mocks/UnitTestMocker";
import path from "path";
import { container } from "tsyringe";

jest.mock("@services/FileManagement/PathAdjuster");

describe("RelativePathLookupAction", () => {
  let relativePathLookupAction: RelativePathLookupAction;
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();

    // Setup spies on prototype methods of dependencies before instantiating RelativePathLookupAction
    mocker.spyOnPrototype(PathAdjuster, "adjustPath", jest.fn());

    // Instantiate RelativePathLookupAction after setting up mocks
    relativePathLookupAction = container.resolve(RelativePathLookupAction);
  });

  afterEach(() => {
    mocker.clearAllMocks();
    container.clearInstances();
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should handle successful path lookup", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const relativePath = "../utils/helper.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
          <path>${relativePath}</path>
        </relative_path_lookup>
      `;
      const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

      const fullImportPath = path.resolve(
        path.dirname(sourcePath),
        relativePath,
      );
      // Mock adjustPath to resolve with expectedAbsolutePath
      (PathAdjuster.prototype.adjustPath as jest.Mock).mockResolvedValueOnce(
        expectedAbsolutePath,
      );

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        originalPath: relativePath,
        newPath: relativePath,
        absolutePath: expectedAbsolutePath,
      });
      expect(PathAdjuster.prototype.adjustPath).toHaveBeenCalledWith(
        fullImportPath,
        0.6,
      );
    });

    it("should handle path lookup with custom threshold", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const relativePath = "../utils/helper.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
          <path>${relativePath}</path>
          <threshold>0.8</threshold>
        </relative_path_lookup>
      `;
      const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

      const fullImportPath = path.resolve(
        path.dirname(sourcePath),
        relativePath,
      );
      // Mock adjustPath to resolve with expectedAbsolutePath
      (PathAdjuster.prototype.adjustPath as jest.Mock).mockResolvedValueOnce(
        expectedAbsolutePath,
      );

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        originalPath: relativePath,
        newPath: relativePath,
        absolutePath: expectedAbsolutePath,
      });
      expect(PathAdjuster.prototype.adjustPath).toHaveBeenCalledWith(
        fullImportPath,
        0.8,
      );
    });

    it("should handle missing source_path tag", async () => {
      const relativePath = "../utils/helper.ts";
      const content = `
        <relative_path_lookup>
          <path>${relativePath}</path>
        </relative_path_lookup>
      `;

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No source_path provided in relative_path_lookup action",
      );
      expect(PathAdjuster.prototype.adjustPath).not.toHaveBeenCalled();
    });

    it("should handle missing path tag", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
        </relative_path_lookup>
      `;

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No path provided in relative_path_lookup action",
      );
      expect(PathAdjuster.prototype.adjustPath).not.toHaveBeenCalled();
    });

    it("should handle path not found", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const relativePath = "../nonexistent/file.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
          <path>${relativePath}</path>
        </relative_path_lookup>
      `;

      const fullImportPath = path.resolve(
        path.dirname(sourcePath),
        relativePath,
      );
      // Mock adjustPath to resolve with null indicating path not found
      (PathAdjuster.prototype.adjustPath as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(PathAdjuster.prototype.adjustPath).toHaveBeenCalledWith(
        fullImportPath,
        0.6,
      );
    });

    it("should handle PathAdjuster errors", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const relativePath = "../utils/helper.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
          <path>${relativePath}</path>
        </relative_path_lookup>
      `;
      const error = new Error("PathAdjuster error");

      const fullImportPath = path.resolve(
        path.dirname(sourcePath),
        relativePath,
      );
      // Mock adjustPath to reject with an error
      (PathAdjuster.prototype.adjustPath as jest.Mock).mockRejectedValueOnce(
        error,
      );

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(PathAdjuster.prototype.adjustPath).toHaveBeenCalledWith(
        fullImportPath,
        0.6,
      );
    });

    it("should convert absolute path to proper relative path", async () => {
      const sourcePath = "/home/user/project/src/components/test.ts";
      const relativePath = "../utils/helper.ts";
      const content = `
        <relative_path_lookup>
          <source_path>${sourcePath}</source_path>
          <path>${relativePath}</path>
        </relative_path_lookup>
      `;
      const adjustedPath = "/home/user/project/src/lib/utils/helper.ts";

      const fullImportPath = path.resolve(
        path.dirname(sourcePath),
        relativePath,
      );
      // Mock adjustPath to resolve with the adjusted absolute path
      (PathAdjuster.prototype.adjustPath as jest.Mock).mockResolvedValueOnce(
        adjustedPath,
      );

      const result = await relativePathLookupAction.execute(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        originalPath: relativePath,
        newPath: "../lib/utils/helper.ts",
        absolutePath: adjustedPath,
      });
      expect(PathAdjuster.prototype.adjustPath).toHaveBeenCalledWith(
        fullImportPath,
        0.6,
      );
    });
  });
});
