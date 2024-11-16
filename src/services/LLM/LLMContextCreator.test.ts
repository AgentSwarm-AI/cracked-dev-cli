import { container } from "tsyringe";
import { DirectoryScanner } from "../FileManagement/DirectoryScanner";
import { ActionExecutor } from "./actions/ActionExecutor";
import { LLMContextCreator } from "./LLMContextCreator";

describe("LLMContextCreator", () => {
  let llmContextCreator: LLMContextCreator;
  let mockDirectoryScanner: jest.Mocked<DirectoryScanner>;
  let mockActionExecutor: jest.Mocked<ActionExecutor>;

  beforeEach(() => {
    mockDirectoryScanner = {
      scan: jest.fn(),
    } as any;

    mockActionExecutor = {
      executeAction: jest.fn(),
    } as any;

    container.registerInstance(DirectoryScanner, mockDirectoryScanner);
    container.registerInstance(ActionExecutor, mockActionExecutor);
    llmContextCreator = container.resolve(LLMContextCreator);
  });

  describe("create", () => {
    const mockTask = "test task";
    const mockRoot = "/test/root";
    const mockScanResult = {
      success: true,
      data: "file1\nfile2",
    };

    beforeEach(() => {
      mockDirectoryScanner.scan.mockResolvedValue(mockScanResult);
    });

    it("should include environment details for first message", async () => {
      const result = await llmContextCreator.create(mockTask, mockRoot, true);

      expect(result).toContain("<environment>");
      expect(result).toContain(mockScanResult.data);
      expect(mockDirectoryScanner.scan).toHaveBeenCalledWith(mockRoot);
    });

    it("should not include environment details for sequential messages", async () => {
      const result = await llmContextCreator.create(mockTask, mockRoot, false);

      expect(result).not.toContain("<environment>");
      expect(mockDirectoryScanner.scan).not.toHaveBeenCalled();
    });

    it("should include all action examples with proper tag format", async () => {
      const result = await llmContextCreator.create(mockTask, mockRoot, true);

      expect(result).toContain(
        "<read_file>\n    <path>/path/here</path>\n  </read_file>",
      );
      expect(result).toContain(
        "<write_file>\n    <path>/path/here</path>\n    <content>",
      );
      expect(result).toContain(
        "<delete_file>\n    <path>/path/here</path>\n  </delete_file>",
      );
      expect(result).toContain(
        "<move_file>\n    <source_path>source/path/here</source_path>\n    <destination_path>destination/path/here</destination_path>\n  </move_file>",
      );
      expect(result).toContain(
        "<copy_file_slice>\n    <source_path>source/path/here</source_path>\n    <destination_path>destination/path/here</destination_path>\n  </copy_file_slice>",
      );
      expect(result).toContain(
        "<search_string>\n    <directory>/path/to/search</directory>\n    <term>pattern to search</term>\n  </search_string>",
      );
      expect(result).toContain(
        "<search_file>\n    <directory>/path/to/search</directory>\n    <term>filename pattern</term>\n  </search_file>",
      );
    });
  });

  describe("parseAndExecuteActions", () => {
    it("should parse and execute actions from response", async () => {
      const mockResponse = `
        <read_file>
          <path>test.txt</path>
        </read_file>
        <execute_command>ls</execute_command>
      `;
      const mockResult = { success: true };
      mockActionExecutor.executeAction.mockResolvedValue(mockResult);

      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(2);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(2);
      expect(results[0].result).toEqual(mockResult);
      expect(results[1].result).toEqual(mockResult);
    });

    it("should handle responses with no actions", async () => {
      const mockResponse = "No actions here";
      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(0);
      expect(mockActionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it("should parse and execute complex actions with nested tags", async () => {
      const mockResponse = `
        <write_file>
          <path>test.txt</path>
          <content>
            Hello World
          </content>
        </write_file>
        <search_string>
          <directory>./src</directory>
          <term>pattern</term>
        </search_string>
      `;
      const mockResult = { success: true };
      mockActionExecutor.executeAction.mockResolvedValue(mockResult);

      const results =
        await llmContextCreator.parseAndExecuteActions(mockResponse);

      expect(results).toHaveLength(2);
      expect(mockActionExecutor.executeAction).toHaveBeenCalledTimes(2);
      expect(results[0].result).toEqual(mockResult);
      expect(results[1].result).toEqual(mockResult);
    });
  });
});
