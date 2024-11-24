import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { RelativePathLookupAction } from "@services/LLM/actions/RelativePathLookupAction";
import path from "path";
import { container } from "tsyringe";

// Create mock classes
class MockPathAdjuster {
  adjustPath = jest.fn();
}

class MockActionTagsExtractor {
  extractTag = jest.fn();
}

// Mock both classes
jest.mock("@services/FileManagement/PathAdjuster", () => ({
  PathAdjuster: jest.fn().mockImplementation(() => new MockPathAdjuster()),
}));

jest.mock("@services/LLM/actions/ActionTagsExtractor", () => ({
  ActionTagsExtractor: jest
    .fn()
    .mockImplementation(() => new MockActionTagsExtractor()),
}));

describe("RelativePathLookupAction", () => {
  let relativePathLookupAction: RelativePathLookupAction;
  let pathAdjuster: MockPathAdjuster;
  let actionTagsExtractor: MockActionTagsExtractor;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();

    // Create new instances of our mocks
    pathAdjuster = new MockPathAdjuster();
    actionTagsExtractor = new MockActionTagsExtractor();

    // Register the mocks with the container
    container.registerInstance(
      PathAdjuster,
      pathAdjuster as unknown as PathAdjuster,
    );
    container.registerInstance(
      ActionTagsExtractor,
      actionTagsExtractor as unknown as ActionTagsExtractor,
    );

    // Set up default mock behavior for ActionTagsExtractor
    actionTagsExtractor.extractTag.mockImplementation((content, tag) => {
      if (content.includes(`<${tag}>`)) {
        const match = content.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
        return match ? match[1].trim() : null;
      }
      return null;
    });

    // Resolve RelativePathLookupAction which will now use our mocks
    relativePathLookupAction = container.resolve(RelativePathLookupAction);
  });

  it("should handle successful path lookup", async () => {
    const sourcePath = "/home/user/project/src/components/test.ts";
    const relativePath = "../utils/helper.ts";
    const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

    pathAdjuster.adjustPath.mockResolvedValue(expectedAbsolutePath);

    const result = await relativePathLookupAction.execute(`
      <relative_path_lookup>
        <source_path>${sourcePath}</source_path>
        <path>${relativePath}</path>
      </relative_path_lookup>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: relativePath,
      newPath: relativePath,
      absolutePath: expectedAbsolutePath,
    });
    expect(pathAdjuster.adjustPath).toHaveBeenCalledWith(
      path.resolve(path.dirname(sourcePath), relativePath),
      0.6,
    );
  });

  it("should handle path lookup with custom threshold", async () => {
    const sourcePath = "/home/user/project/src/components/test.ts";
    const relativePath = "../utils/helper.ts";
    const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

    pathAdjuster.adjustPath.mockResolvedValue(expectedAbsolutePath);

    const result = await relativePathLookupAction.execute(`
      <relative_path_lookup>
        <source_path>${sourcePath}</source_path>
        <path>${relativePath}</path>
        <threshold>0.8</threshold>
      </relative_path_lookup>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: relativePath,
      newPath: relativePath,
      absolutePath: expectedAbsolutePath,
    });
    expect(pathAdjuster.adjustPath).toHaveBeenCalledWith(
      path.resolve(path.dirname(sourcePath), relativePath),
      0.8,
    );
  });

  describe("validation", () => {
    it("should fail when source_path is missing", async () => {
      const result = await relativePathLookupAction.execute(`
        <relative_path_lookup>
          <path>../utils/helper.ts</path>
        </relative_path_lookup>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No source_path provided");
      expect(pathAdjuster.adjustPath).not.toHaveBeenCalled();
    });

    it("should fail when path is missing", async () => {
      const result = await relativePathLookupAction.execute(`
        <relative_path_lookup>
          <source_path>/home/user/project/src/components/test.ts</source_path>
        </relative_path_lookup>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No path provided");
      expect(pathAdjuster.adjustPath).not.toHaveBeenCalled();
    });

    it("should fail when threshold is invalid", async () => {
      const result = await relativePathLookupAction.execute(`
        <relative_path_lookup>
          <source_path>/home/user/project/src/components/test.ts</source_path>
          <path>../utils/helper.ts</path>
          <threshold>1.5</threshold>
        </relative_path_lookup>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Threshold must be between 0 and 1");
      expect(pathAdjuster.adjustPath).not.toHaveBeenCalled();
    });
  });

  it("should handle path not found", async () => {
    const sourcePath = "/home/user/project/src/components/test.ts";
    const relativePath = "../nonexistent/file.ts";

    pathAdjuster.adjustPath.mockResolvedValue(null);

    const result = await relativePathLookupAction.execute(`
      <relative_path_lookup>
        <source_path>${sourcePath}</source_path>
        <path>${relativePath}</path>
      </relative_path_lookup>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(pathAdjuster.adjustPath).toHaveBeenCalledWith(
      path.resolve(path.dirname(sourcePath), relativePath),
      0.6,
    );
  });

  it("should handle PathAdjuster errors", async () => {
    const sourcePath = "/home/user/project/src/components/test.ts";
    const relativePath = "../utils/helper.ts";
    const error = new Error("PathAdjuster error");

    pathAdjuster.adjustPath.mockRejectedValue(error);

    const result = await relativePathLookupAction.execute(`
      <relative_path_lookup>
        <source_path>${sourcePath}</source_path>
        <path>${relativePath}</path>
      </relative_path_lookup>
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(pathAdjuster.adjustPath).toHaveBeenCalledWith(
      path.resolve(path.dirname(sourcePath), relativePath),
      0.6,
    );
  });

  it("should handle whitespace in parameters", async () => {
    const sourcePath = "/home/user/project/src/components/test.ts";
    const relativePath = "../utils/helper.ts";
    const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

    pathAdjuster.adjustPath.mockResolvedValue(expectedAbsolutePath);

    const result = await relativePathLookupAction.execute(`
      <relative_path_lookup>
        <source_path>
          ${sourcePath}
        </source_path>
        <path>
          ${relativePath}
        </path>
      </relative_path_lookup>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: relativePath,
      newPath: relativePath,
      absolutePath: expectedAbsolutePath,
    });
    expect(pathAdjuster.adjustPath).toHaveBeenCalledWith(
      path.resolve(path.dirname(sourcePath), relativePath),
      0.6,
    );
  });
});
