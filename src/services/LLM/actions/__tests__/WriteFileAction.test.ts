import { FileOperations } from "../../../FileManagement/FileOperations";
import { HtmlEntityDecoder } from "../../../text/HTMLEntityDecoder";
import { ModelScaler } from "../../ModelScaler";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { WriteFileAction } from "../WriteFileAction";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");
jest.mock("../../../text/HTMLEntityDecoder");
jest.mock("../../ModelScaler");

describe("WriteFileAction", () => {
  let writeFileAction: WriteFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockModelScaler: jest.Mocked<ModelScaler>;

  beforeEach(() => {
    mockFileOperations = {
      write: jest.fn(),
      exists: jest.fn(),
      read: jest.fn(),
    } as any;

    mockActionTagsExtractor = {
      extractTag: jest.fn(),
    } as any;

    mockHtmlEntityDecoder = {
      decode: jest.fn(),
    } as any;

    mockModelScaler = {
      getCurrentModel: jest.fn(),
      getTryCount: jest.fn(),
      incrementTryCount: jest.fn(),
      setTryCount: jest.fn(),
    } as any;

    writeFileAction = new WriteFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
      mockHtmlEntityDecoder,
      mockModelScaler,
    );
  });

  it("should handle try count and model scaling", async () => {
    // Setup
    const filePath = "/test/file.ts";
    const content = "test content";
    const tryCount = "2";

    mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
      switch (tag) {
        case "path":
          return filePath;
        case "content":
          return content;
        case "try":
          return tryCount;
        default:
          return null;
      }
    });

    mockModelScaler.getCurrentModel.mockReturnValue("test-model");
    mockFileOperations.exists.mockResolvedValue(false);
    mockFileOperations.write.mockResolvedValue({ success: true });
    mockHtmlEntityDecoder.decode.mockReturnValue(content);

    // Execute
    const result = await writeFileAction.execute(
      "<write_file>test</write_file>",
    );

    // Verify
    expect(result.success).toBe(true);
    expect(mockModelScaler.setTryCount).toHaveBeenCalledWith(filePath, 2);
    expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
  });

  it("should not set try count when no try tag is present", async () => {
    // Setup
    const filePath = "/test/file.ts";
    const content = "test content";

    mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
      switch (tag) {
        case "path":
          return filePath;
        case "content":
          return content;
        default:
          return null;
      }
    });

    mockModelScaler.getCurrentModel.mockReturnValue("test-model");
    mockFileOperations.exists.mockResolvedValue(false);
    mockFileOperations.write.mockResolvedValue({ success: true });
    mockHtmlEntityDecoder.decode.mockReturnValue(content);

    // Execute
    const result = await writeFileAction.execute(
      "<write_file>test</write_file>",
    );

    // Verify
    expect(result.success).toBe(true);
    expect(mockModelScaler.setTryCount).not.toHaveBeenCalled();
    expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
  });
});
