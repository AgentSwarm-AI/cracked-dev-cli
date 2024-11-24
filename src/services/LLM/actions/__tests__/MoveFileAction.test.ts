import { FileOperations } from "@services/FileManagement/FileOperations";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { MoveFileAction } from "@services/LLM/actions/MoveFileAction";
import { container } from "tsyringe";

// Create mock classes
class MockFileOperations {
  move = jest.fn();
  exists = jest.fn();
}

class MockActionTagsExtractor {
  extractTag = jest.fn();
}

// Mock both classes
jest.mock("@services/FileManagement/FileOperations", () => ({
  FileOperations: jest.fn().mockImplementation(() => new MockFileOperations()),
}));

jest.mock("@services/LLM/actions/ActionTagsExtractor", () => ({
  ActionTagsExtractor: jest
    .fn()
    .mockImplementation(() => new MockActionTagsExtractor()),
}));

describe("MoveFileAction", () => {
  let moveFileAction: MoveFileAction;
  let fileOperations: MockFileOperations;
  let actionTagsExtractor: MockActionTagsExtractor;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();

    // Create new instances of our mocks
    fileOperations = new MockFileOperations();
    actionTagsExtractor = new MockActionTagsExtractor();

    // Register the mocks with the container
    container.registerInstance(
      FileOperations,
      fileOperations as unknown as FileOperations,
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

    // Resolve MoveFileAction which will now use our mocks
    moveFileAction = container.resolve(MoveFileAction);
  });

  it("should move file successfully with valid parameters", async () => {
    fileOperations.move.mockResolvedValue({
      success: true,
      data: "File moved successfully",
    });

    const result = await moveFileAction.execute(`
      <move_file>
        <source_path>src/old/file.ts</source_path>
        <destination_path>src/new/file.ts</destination_path>
      </move_file>
    `);

    expect(result.success).toBe(true);
    expect(result.data).toBe("File moved successfully");
    expect(fileOperations.move).toHaveBeenCalledWith(
      "src/old/file.ts",
      "src/new/file.ts",
    );
  });

  it("should handle move operation failure", async () => {
    const error = new Error("Move operation failed");
    fileOperations.move.mockResolvedValue({ success: false, error });

    const result = await moveFileAction.execute(`
      <move_file>
        <source_path>src/old/file.ts</source_path>
        <destination_path>src/new/file.ts</destination_path>
      </move_file>
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });

  describe("validation", () => {
    it("should fail when source path is missing", async () => {
      const result = await moveFileAction.execute(`
        <move_file>
          <destination_path>src/new/file.ts</destination_path>
        </move_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No source path provided");
    });

    it("should fail when destination path is missing", async () => {
      const result = await moveFileAction.execute(`
        <move_file>
          <source_path>src/old/file.ts</source_path>
        </move_file>
      `);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No destination path provided");
    });

    it("should handle whitespace in parameters", async () => {
      fileOperations.move.mockResolvedValue({
        success: true,
        data: "File moved successfully",
      });

      const result = await moveFileAction.execute(`
        <move_file>
          <source_path>
            src/old path/file.ts
          </source_path>
          <destination_path>
            src/new path/file.ts
          </destination_path>
        </move_file>
      `);

      expect(result.success).toBe(true);
      expect(fileOperations.move).toHaveBeenCalledWith(
        "src/old path/file.ts",
        "src/new path/file.ts",
      );
    });
  });
});
