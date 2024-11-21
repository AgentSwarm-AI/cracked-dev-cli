import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { RelativePathLookupAction } from "@services/LLM/actions/RelativePathLookupAction";
import { UnitTestMocker } from "../../../../jest/mocks/UnitTestMocker"; // Corrected path

jest.mock("@services/FileManagement/PathAdjuster");

describe("RelativePathLookupAction", () => {
  let relativePathLookupAction: RelativePathLookupAction;
  let mocker: UnitTestMocker;
  let mockPathAdjuster: jest.Mocked<PathAdjuster>;

  beforeEach(() => {
    mocker = new UnitTestMocker();
    mockPathAdjuster = new PathAdjuster() as jest.Mocked<PathAdjuster>;
    relativePathLookupAction = new RelativePathLookupAction(mockPathAdjuster);
  });

  afterEach(() => {
    mocker.clearAllMocks();
  });

  it("should handle successful path lookup", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
        <path>../utils/helper.ts</path>
      </relative_path_lookup>
    `;
    const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

    mockPathAdjuster.adjustPath.mockResolvedValue(expectedAbsolutePath);

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: "../utils/helper.ts",
      newPath: "../utils/helper.ts",
      absolutePath: expectedAbsolutePath,
    });
    expect(mockPathAdjuster.adjustPath).toHaveBeenCalledWith(
      expectedAbsolutePath,
      0.6,
    );
  });

  it("should handle path lookup with custom threshold", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
        <path>../utils/helper.ts</path>
        <threshold>0.8</threshold>
      </relative_path_lookup>
    `;
    const expectedAbsolutePath = "/home/user/project/src/utils/helper.ts";

    mockPathAdjuster.adjustPath.mockResolvedValue(expectedAbsolutePath);

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: "../utils/helper.ts",
      newPath: "../utils/helper.ts",
      absolutePath: expectedAbsolutePath,
    });
    expect(mockPathAdjuster.adjustPath).toHaveBeenCalledWith(
      expectedAbsolutePath,
      0.8,
    );
  });

  it("should handle missing source_path tag", async () => {
    const content = `
      <relative_path_lookup>
        <path>../utils/helper.ts</path>
      </relative_path_lookup>
    `;

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "No source_path provided in relative_path_lookup action",
    );
    expect(mockPathAdjuster.adjustPath).not.toHaveBeenCalled();
  });

  it("should handle missing path tag", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
      </relative_path_lookup>
    `;

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(
      "No path provided in relative_path_lookup action",
    );
    expect(mockPathAdjuster.adjustPath).not.toHaveBeenCalled();
  });

  it("should handle path not found", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
        <path>../nonexistent/file.ts</path>
      </relative_path_lookup>
    `;

    mockPathAdjuster.adjustPath.mockResolvedValue(null);

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("should handle PathAdjuster errors", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
        <path>../utils/helper.ts</path>
      </relative_path_lookup>
    `;
    const error = new Error("PathAdjuster error");

    mockPathAdjuster.adjustPath.mockRejectedValue(error);

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  it("should convert absolute path to proper relative path", async () => {
    const content = `
      <relative_path_lookup>
        <source_path>/home/user/project/src/components/test.ts</source_path>
        <path>../utils/helper.ts</path>
      </relative_path_lookup>
    `;
    const adjustedPath = "/home/user/project/src/lib/utils/helper.ts";

    mockPathAdjuster.adjustPath.mockResolvedValue(adjustedPath);

    const result = await relativePathLookupAction.execute(content);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      originalPath: "../utils/helper.ts",
      newPath: "../lib/utils/helper.ts",
      absolutePath: adjustedPath,
    });
  });
});