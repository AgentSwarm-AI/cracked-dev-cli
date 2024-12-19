/* eslint-disable @typescript-eslint/no-var-requires */

import { UnitTestMocker } from "@/jest/mocks/UnitTestMocker";
import { FileOperations } from "@services/FileManagement/FileOperations";
import { ActionTagsExtractor } from "@services/LLM/actions/ActionTagsExtractor";
import { WriteFileAction } from "@services/LLM/actions/WriteFileAction";
import { ModelScaler } from "@services/LLM/ModelScaler";
import { HtmlEntityDecoder } from "@services/text/HTMLEntityDecoder";
import * as path from "path";

jest.mock("@services/FileManagement/FileOperations");
jest.mock("@services/LLM/actions/ActionTagsExtractor");
jest.mock("@services/text/HTMLEntityDecoder");
jest.mock("@services/LLM/ModelScaler");
jest.mock("@constants/writeConstants", () => ({
  BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD: 50,
}));

const testDir = path.join(__dirname, "test-files");

describe("WriteFileAction", () => {
  let writeFileAction: WriteFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;
  let mockHtmlEntityDecoder: jest.Mocked<HtmlEntityDecoder>;
  let mockModelScaler: jest.Mocked<ModelScaler>;
  let mocker: UnitTestMocker;

  beforeAll(() => {
    mocker = new UnitTestMocker();
  });

  beforeEach(() => {
    mockFileOperations = {
      write: jest.fn(),
      exists: jest.fn(),
      read: jest.fn(),
      getAdjustedPath: jest.fn(),
      findSimilarFiles: jest.fn(),
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
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

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
      const content = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
          <child attr="value">Text</child>
        </root>`;
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle content with no whitespace", async () => {
      const filePath = "/test/file.ts";
      const content = "content-without-whitespace";
      const actionContent = `<write_file><type>new</type><path>${filePath}</path><content>${content}</content></write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle content with nested XML-like tags and attributes", async () => {
      const filePath = "/test/file.xml";
      const content = `
        <root xmlns="http://example.com">
          <child id="1" class="test">
            <grandchild>Text</grandchild>
          </child>
        </root>`;
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

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
          <type>update</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

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
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockModelScaler.incrementTryCount).not.toHaveBeenCalled();
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle file write errors", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.findSimilarFiles.mockResolvedValue([filePath]);
      mockFileOperations.write.mockResolvedValue({
        success: false,
        error: new Error("Write failed"),
      });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Write failed");
    });

    it("should write a new file if path does not exist", async () => {
      const filePath = "/test/newfile.ts";
      const content = "new file content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
      expect(mockModelScaler.incrementTryCount).not.toHaveBeenCalled();
      expect(mockFileOperations.read).not.toHaveBeenCalled();
    });

    it("should create directory and write file when parent directory doesn't exist", async () => {
      const filePath = path.join(testDir, "new-folder", "test.txt");
      const content = "New content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });
  });

  describe("content removal protection", () => {
    it("should allow writes with acceptable content reduction", async () => {
      const filePath = "/test/file.ts";
      const existingContent = "Original content";
      const newContent = "Modified content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

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
          <type>new</type>
          <path>${filePath}</path>
          <content>${encodedContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            content.match(/<content>([\s\S]*?)<\/content>/)?.[1].trim() || null
          );
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(decodedContent);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockHtmlEntityDecoder.decode).toHaveBeenCalledWith(
        encodedContent,
        {
          unescapeChars: expect.any(Array),
        },
      );
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        filePath,
        decodedContent,
      );
    });

    it("should block writes with excessive content removal", async () => {
      const filePath = "/test/file.ts";
      const existingContent =
        "This is a very long content that should not be completely removed or significantly shortened";
      const newContent = "Very short";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: existingContent,
      });
      mockHtmlEntityDecoder.decode.mockReturnValue(newContent);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Prevented removal of");
      expect(result.error?.message).toContain("%");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should proceed with write when file read fails", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: false,
        error: new Error("Read failed"),
      });
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should handle empty existing files", async () => {
      const filePath = "/test/file.ts";
      const newContent = "New content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "",
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

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return "/test/file.ts";
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("No file content provided");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when path contains traversal", async () => {
      const filePath = "../test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Path traversal is not allowed");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when content size exceeds limit", async () => {
      const filePath = "/test/file.ts";
      const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${largeContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return (
            largeContent.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null
          );
        if (tag === "type") return "new";
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Content size");
      expect(result.error?.message).toContain("exceeds maximum allowed size");
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when content contains null bytes", async () => {
      const filePath = "/test/file.ts";
      const content = "test\0content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid content detected after decoding",
      );
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when content contains excessively long lines", async () => {
      const filePath = "/test/file.ts";
      const content = "x".repeat(11000); // Line longer than 10000 chars
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid content detected after decoding",
      );
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });
  });

  describe("blueprint", () => {
    it("should return the correct blueprint", () => {
      const blueprint = writeFileAction["getBlueprint"]();
      expect(blueprint).toBeDefined();
      expect(blueprint).toBe(
        require("../blueprints/writeFileActionBlueprint")
          .writeFileActionBlueprint,
      );
    });
  });

  describe("content removal calculation", () => {
    it("should handle whitespace in content removal calculation", async () => {
      const filePath = "/test/file.ts";
      const existingContent = "   content with spaces   ";
      const newContent = "content with spaces";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: existingContent,
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

    it("should handle newlines in content removal calculation", async () => {
      const filePath = "/test/file.ts";
      const existingContent = "\n\ncontent\nwith\nnewlines\n\n";
      const newContent = "content\nwith\nnewlines";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${newContent}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(true);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: existingContent,
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
  });

  describe("file type behavior", () => {
    it("should fail when type parameter is missing", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return null;
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid or missing type parameter (must be 'new' or 'update')",
      );
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should fail when type parameter is invalid", async () => {
      const filePath = "/test/file.ts";
      const content = "test content";
      const actionContent = `
        <write_file>
          <type>invalid</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "invalid";
        return null;
      });

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid or missing type parameter (must be 'new' or 'update')",
      );
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should skip path search for new files", async () => {
      const filePath = "/test/newfile.ts";
      const content = "new file content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.findSimilarFiles).not.toHaveBeenCalled();
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });

    it("should search for similar files when updating non-existent file", async () => {
      const originalPath = "/test/nonexistent.ts";
      const similarPath = "/test/existing.ts";
      const content = "update content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${originalPath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return originalPath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.findSimilarFiles.mockResolvedValue([similarPath]);
      mockFileOperations.read.mockResolvedValue({
        success: true,
        data: "existing content",
      });
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.findSimilarFiles).toHaveBeenCalledWith(
        originalPath,
      );
      expect(mockFileOperations.write).toHaveBeenCalledWith(
        similarPath,
        content,
      );
    });

    it("should fail when no similar files found for update", async () => {
      const filePath = "/test/nonexistent.ts";
      const content = "update content";
      const actionContent = `
        <write_file>
          <type>update</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "update";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.findSimilarFiles.mockResolvedValue([]);
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        `Cannot update file ${filePath} - file not found and no similar files exist`,
      );
      expect(mockFileOperations.write).not.toHaveBeenCalled();
    });

    it("should perform content removal check only for updates", async () => {
      const filePath = "/test/file.ts";
      const content = "very short content";
      const actionContent = `
        <write_file>
          <type>new</type>
          <path>${filePath}</path>
          <content>${content}</content>
        </write_file>`;

      mockActionTagsExtractor.extractTag.mockImplementation((content, tag) => {
        if (tag === "path") return filePath;
        if (tag === "content")
          return content.match(/<content>([\s\S]*?)<\/content>/)?.[1] || null;
        if (tag === "type") return "new";
        return null;
      });

      mockModelScaler.isAutoScalerEnabled.mockReturnValue(false);
      mockFileOperations.exists.mockResolvedValue(false);
      mockFileOperations.write.mockResolvedValue({ success: true });
      mockHtmlEntityDecoder.decode.mockReturnValue(content);

      const result = await writeFileAction.execute(actionContent);

      expect(result.success).toBe(true);
      expect(mockFileOperations.read).not.toHaveBeenCalled();
      expect(mockFileOperations.write).toHaveBeenCalledWith(filePath, content);
    });
  });
});
