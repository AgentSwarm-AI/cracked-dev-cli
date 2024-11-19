import { FileOperations } from "../../../FileManagement/FileOperations";
import { ActionTagsExtractor } from "../ActionTagsExtractor";
import { EditFileAction } from "../EditFileAction";

jest.mock("../../../FileManagement/FileOperations");
jest.mock("../ActionTagsExtractor");

describe("EditFileAction", () => {
  let editFileAction: EditFileAction;
  let mockFileOperations: jest.Mocked<FileOperations>;
  let mockActionTagsExtractor: jest.Mocked<ActionTagsExtractor>;

  beforeEach(() => {
    mockFileOperations = new FileOperations() as jest.Mocked<FileOperations>;
    mockActionTagsExtractor =
      new ActionTagsExtractor() as jest.Mocked<ActionTagsExtractor>;
    editFileAction = new EditFileAction(
      mockFileOperations,
      mockActionTagsExtractor,
    );
  });

  describe("Legacy Single File Format", () => {
    it("should handle replace operation", async () => {
      const content = `
        <edit_file>
          <path>test.ts</path>
          <changes>
            <replace>
              <pattern>function\\s+oldName</pattern>
              <content>function newName</content>
            </replace>
          </changes>
        </edit_file>
      `;

      mockActionTagsExtractor.extractTag.mockImplementation((text, tag) => {
        if (tag === "path") return "test.ts";
        if (tag === "changes") return content;
        if (tag === "pattern") return "function\\s+oldName";
        if (tag === "content") return "function newName";
        return null;
      });

      mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
        (text, tag) => {
          if (tag === "replace") {
            return [
              `
              <replace>
                <pattern>function\\s+oldName</pattern>
                <content>function newName</content>
              </replace>
            `,
            ];
          }
          if (tag === "file") return [];
          return [];
        },
      );

      mockFileOperations.edit.mockResolvedValue({ success: true });

      const result = await editFileAction.execute(content);

      expect(result.success).toBe(true);
      expect(mockFileOperations.edit).toHaveBeenCalledWith("test.ts", [
        {
          type: "replace",
          pattern: "function\\s+oldName",
          content: "function newName",
        },
      ]);
    });

    // Previous single file tests remain unchanged...
  });

  describe("Multiple File Format", () => {
    it("should handle multiple file edits", async () => {
      const content = `
        <edit_file>
          <changes>
            <file>
              <path>test1.ts</path>
              <replace>
                <pattern>oldFunction</pattern>
                <content>newFunction</content>
              </replace>
            </file>
            <file>
              <path>test2.ts</path>
              <insert_after>
                <pattern>class Test</pattern>
                <content>  newProperty: string;</content>
              </insert_after>
            </file>
          </changes>
        </edit_file>
      `;

      mockActionTagsExtractor.extractTag.mockImplementation((text, tag) => {
        if (tag === "changes") return content;
        if (tag === "path" && text.includes("test1.ts")) return "test1.ts";
        if (tag === "path" && text.includes("test2.ts")) return "test2.ts";
        if (tag === "pattern" && text.includes("oldFunction"))
          return "oldFunction";
        if (tag === "content" && text.includes("newFunction"))
          return "newFunction";
        if (tag === "pattern" && text.includes("class Test"))
          return "class Test";
        if (tag === "content" && text.includes("newProperty"))
          return "  newProperty: string;";
        return null;
      });

      mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
        (text, tag) => {
          if (tag === "file") {
            return [
              `
              <file>
                <path>test1.ts</path>
                <replace>
                  <pattern>oldFunction</pattern>
                  <content>newFunction</content>
                </replace>
              </file>
              `,
              `
              <file>
                <path>test2.ts</path>
                <insert_after>
                  <pattern>class Test</pattern>
                  <content>  newProperty: string;</content>
                </insert_after>
              </file>
              `,
            ];
          }
          if (tag === "replace" && text.includes("test1.ts")) {
            return [
              `
              <replace>
                <pattern>oldFunction</pattern>
                <content>newFunction</content>
              </replace>
              `,
            ];
          }
          if (tag === "insert_after" && text.includes("test2.ts")) {
            return [
              `
              <insert_after>
                <pattern>class Test</pattern>
                <content>  newProperty: string;</content>
              </insert_after>
              `,
            ];
          }
          return [];
        },
      );

      mockFileOperations.edit.mockResolvedValue({ success: true });

      const result = await editFileAction.execute(content);

      expect(result.success).toBe(true);
      expect(mockFileOperations.edit).toHaveBeenCalledTimes(2);
      expect(mockFileOperations.edit).toHaveBeenCalledWith("test1.ts", [
        {
          type: "replace",
          pattern: "oldFunction",
          content: "newFunction",
        },
      ]);
      expect(mockFileOperations.edit).toHaveBeenCalledWith("test2.ts", [
        {
          type: "insert_after",
          pattern: "class Test",
          content: "  newProperty: string;",
        },
      ]);
    });

    it("should handle validation command", async () => {
      const content = `
        <edit_file>
          <changes>
            <file>
              <path>test.ts</path>
              <replace>
                <pattern>old</pattern>
                <content>new</content>
              </replace>
            </file>
          </changes>
          <validate>npm run lint</validate>
        </edit_file>
      `;

      mockActionTagsExtractor.extractTag.mockImplementation((text, tag) => {
        if (tag === "changes") return content;
        if (tag === "validate") return "npm run lint";
        if (tag === "path") return "test.ts";
        if (tag === "pattern") return "old";
        if (tag === "content") return "new";
        return null;
      });

      mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
        (text, tag) => {
          if (tag === "file") {
            return [
              `
              <file>
                <path>test.ts</path>
                <replace>
                  <pattern>old</pattern>
                  <content>new</content>
                </replace>
              </file>
              `,
            ];
          }
          if (tag === "replace") {
            return [
              `
              <replace>
                <pattern>old</pattern>
                <content>new</content>
              </replace>
              `,
            ];
          }
          return [];
        },
      );

      mockFileOperations.edit.mockResolvedValue({ success: true });

      const result = await editFileAction.execute(content);

      expect(result.success).toBe(true);
      expect(mockFileOperations.edit).toHaveBeenCalledWith("test.ts", [
        {
          type: "replace",
          pattern: "old",
          content: "new",
        },
      ]);
    });

    it("should handle missing path in file tag", async () => {
      const content = `
        <edit_file>
          <changes>
            <file>
              <replace>
                <pattern>old</pattern>
                <content>new</content>
              </replace>
            </file>
          </changes>
        </edit_file>
      `;

      mockActionTagsExtractor.extractTag.mockImplementation((text, tag) => {
        if (tag === "changes") return content;
        return null;
      });

      mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
        (text, tag) => {
          if (tag === "file") {
            return [
              `
              <file>
                <replace>
                  <pattern>old</pattern>
                  <content>new</content>
                </replace>
              </file>
              `,
            ];
          }
          return [];
        },
      );

      const result = await editFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "Invalid file tag format. Must include path.",
      );
    });

    it("should handle no operations in file tag", async () => {
      const content = `
        <edit_file>
          <changes>
            <file>
              <path>test.ts</path>
            </file>
          </changes>
        </edit_file>
      `;

      mockActionTagsExtractor.extractTag.mockImplementation((text, tag) => {
        if (tag === "changes") return content;
        if (tag === "path") return "test.ts";
        return null;
      });

      mockActionTagsExtractor.extractAllTagsWithContent.mockImplementation(
        (text, tag) => {
          if (tag === "file") {
            return [
              `
              <file>
                <path>test.ts</path>
              </file>
              `,
            ];
          }
          return [];
        },
      );

      const result = await editFileAction.execute(content);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe(
        "No valid operations found for file: test.ts",
      );
    });
  });
});
