import { container } from "tsyringe";
import { ActionTagsExtractor } from "../ActionTagsExtractor";

describe("TagsExtractor", () => {
  let actionTagsExtractor: ActionTagsExtractor;

  beforeEach(() => {
    actionTagsExtractor = container.resolve(ActionTagsExtractor);
  });

  describe("validateStructure", () => {
    it("should return empty string for valid tag structure", () => {
      const content = "<read_file><path>test.txt</path></read_file>";
      expect(actionTagsExtractor.validateStructure(content)).toBe("");
    });

    it("should detect missing closing tag", () => {
      const content = "<read_file><path>test.txt</path>";
      expect(actionTagsExtractor.validateStructure(content)).toContain(
        "Missing closing tag for <read_file>",
      );
    });

    it("should detect missing opening tag", () => {
      const content = "<path>test.txt</path></read_file>";
      expect(actionTagsExtractor.validateStructure(content)).toContain(
        "Missing opening tag for <read_file>",
      );
    });

    it("should handle multiple valid tags", () => {
      const content =
        "<read_file><path>test.txt</path></read_file><write_file><path>out.txt</path><content>data</content></write_file>";
      expect(actionTagsExtractor.validateStructure(content)).toBe("");
    });
  });

  describe("extractTag", () => {
    it("should extract single tag content", () => {
      const content = "<test>Hello World</test>";
      expect(actionTagsExtractor.extractTag(content, "test")).toBe(
        "Hello World",
      );
    });

    it("should handle multiline content", () => {
      const content = "<test>\nHello\nWorld\n</test>";
      expect(actionTagsExtractor.extractTag(content, "test")).toBe(
        "Hello\nWorld",
      );
    });

    it("should return null for non-existent tag", () => {
      const content = "<test>Hello World</test>";
      expect(actionTagsExtractor.extractTag(content, "nonexistent")).toBeNull();
    });
  });

  describe("extractTags", () => {
    it("should extract multiple instances of a tag", () => {
      const content =
        "<test>First</test><other>Skip</other><test>Second</test>";
      expect(actionTagsExtractor.extractTags(content, "test")).toEqual([
        "First",
        "Second",
      ]);
    });

    it("should return empty array when no tags found", () => {
      const content = "<other>Skip</other>";
      expect(actionTagsExtractor.extractTags(content, "test")).toEqual([]);
    });
  });

  describe("extractTagLines", () => {
    it("should split tag content into lines", () => {
      const content = "<test>\n  Line 1  \n  Line 2  \n</test>";
      expect(actionTagsExtractor.extractTagLines(content, "test")).toEqual([
        "Line 1",
        "Line 2",
      ]);
    });

    it("should filter empty lines", () => {
      const content = "<test>\n  Line 1  \n\n  \n  Line 2  \n</test>";
      expect(actionTagsExtractor.extractTagLines(content, "test")).toEqual([
        "Line 1",
        "Line 2",
      ]);
    });

    it("should return empty array for non-existent tag", () => {
      const content = "<other>Skip</other>";
      expect(actionTagsExtractor.extractTagLines(content, "test")).toEqual([]);
    });
  });

  describe("extractNestedTags", () => {
    it("should extract nested tags", () => {
      const content =
        "<parent><child>First</child><child>Second</child></parent>";
      expect(
        actionTagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual(["First", "Second"]);
    });

    it("should return empty array when parent tag not found", () => {
      const content = "<other><child>Skip</child></other>";
      expect(
        actionTagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual([]);
    });

    it("should return empty array when child tags not found", () => {
      const content = "<parent><other>Skip</other></parent>";
      expect(
        actionTagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual([]);
    });
  });
});
