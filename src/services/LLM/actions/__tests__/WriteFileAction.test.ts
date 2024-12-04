import { FileOperations } from "@services/FileManagement/FileOperations";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { WriteFileAction } from "@services/LLM/actions/WriteFileAction";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";

jest.mock("@services/FileManagement/FileOperations");
jest.mock("@services/LLM/actions/ActionTagsExtractor");
jest.mock("@services/text/HTMLEntityDecoder");
jest.mock("@services/LLM/ModelScaler");

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
      isAutoScalerEnabled: jest.fn(),
    } as any;

    writeFileAction = new WriteFileAction(
      mockActionTagsExtractor,
      mockFileOperations,
      mockHtmlEntityDecoder,
      mockModelScaler,
    );
  });

  describe("parameter extraction", () => {
    it("should preserve nested tags in content parameter", async () => {
      const filePath = "/test/file.ts";
      const content = "<div>Test</div>\n<span>Content</span>";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>
            ${content}
          </content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle content with XML-like syntax", async () => {
      const filePath = "/test/file.xml";
      const content = `
        <?xml version="1.0" encoding="UTF-8"?>
        <root>
          <child attr="value">Text</child>
        </root>`;
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>
            ${content}
          </content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });
  });

  describe("file operations", () => {
    it("should increment try count for existing files", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "existing content",
      });
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockModelScaler.incrementTryCount).toHaveBeenCalledWith(filePath);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should not modify try count for new files", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockModelScaler.incrementTryCount).not.toHaveBeenCalled();
      expect(mockModelScaler.setTryCount).not.toHaveBeenCalled();
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle file write errors", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({
        success: false,
        error: new Error("Write failed"),
      });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Write failed");
    });
  });

  describe("content removal protection", () => {
    it("should allow writes with acceptable content reduction", async () => {
      const filePath = "/test/file.ts";
      const existingContent = "Original content";
      const newContent = "Modified content";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: existingContent,
        error: undefined,
      });
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(newContent);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        filePath,
        newContent,
      );
    });

    it("should properly decode HTML entities before writing", async () => {
      const filePath = "/test/file.ts";
      const encodedContent = "&lt;div&gt;Test&lt;/div&gt;";
      const decodedContent = "<div>Test</div>";
      const actionContent = `
        <write_file>
          <path>${filePath}</path>
          <content>${encodedContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return filePath;
        return null;
      });

      mockModelScaler.getCurrentModel.mockReturnValue("test-model");
      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(decodedContent);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(encodedContent);
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        filePath,
        decodedContent,
      );
    });
  });

  describe("validation", () => {
    it("should fail when path is missing", async () => {
      const actionContent = `
        <write_file>
          <content>test content</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockReturnValue(null);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No file path provided");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when content is missing", async () => {
      const actionContent = `
        <write_file>
          <path>/test/file.ts</path>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((_, tag) => {
        if (tag === "path") return "/test/file.ts";
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No file content provided");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });
  });
});
