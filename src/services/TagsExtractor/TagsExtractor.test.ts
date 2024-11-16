import { container } from "tsyringe";
import { TagsExtractor } from "./TagsExtractor";

describe("TagsExtractor", () => {
  let tagsExtractor: TagsExtractor;

  beforeEach(() => {
    tagsExtractor = container.resolve(TagsExtractor);
  });

  describe("extractTag", () => {
    it("should extract single tag content", () => {
      const content = "<test>Hello World</test>";
      expect(tagsExtractor.extractTag(content, "test")).toBe("Hello World");
    });

    it("should handle multiline content", () => {
      const content = "<test>\nHello\nWorld\n</test>";
      expect(tagsExtractor.extractTag(content, "test")).toBe("Hello\nWorld");
    });

    it("should return null for non-existent tag", () => {
      const content = "<test>Hello World</test>";
      expect(tagsExtractor.extractTag(content, "nonexistent")).toBeNull();
    });
  });

  describe("extractTags", () => {
    it("should extract multiple instances of a tag", () => {
      const content =
        "<test>First</test><other>Skip</other><test>Second</test>";
      expect(tagsExtractor.extractTags(content, "test")).toEqual([
        "First",
        "Second",
      ]);
    });

    it("should return empty array when no tags found", () => {
      const content = "<other>Skip</other>";
      expect(tagsExtractor.extractTags(content, "test")).toEqual([]);
    });
  });

  describe("extractTagLines", () => {
    it("should split tag content into lines", () => {
      const content = "<test>\n  Line 1  \n  Line 2  \n</test>";
      expect(tagsExtractor.extractTagLines(content, "test")).toEqual([
        "Line 1",
        "Line 2",
      ]);
    });

    it("should filter empty lines", () => {
      const content = "<test>\n  Line 1  \n\n  \n  Line 2  \n</test>";
      expect(tagsExtractor.extractTagLines(content, "test")).toEqual([
        "Line 1",
        "Line 2",
      ]);
    });

    it("should return empty array for non-existent tag", () => {
      const content = "<other>Skip</other>";
      expect(tagsExtractor.extractTagLines(content, "test")).toEqual([]);
    });
  });

  describe("extractNestedTags", () => {
    it("should extract nested tags", () => {
      const content =
        "<parent><child>First</child><child>Second</child></parent>";
      expect(
        tagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual(["First", "Second"]);
    });

    it("should return empty array when parent tag not found", () => {
      const content = "<other><child>Skip</child></other>";
      expect(
        tagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual([]);
    });

    it("should return empty array when child tags not found", () => {
      const content = "<parent><other>Skip</other></parent>";
      expect(
        tagsExtractor.extractNestedTags(content, "parent", "child"),
      ).toEqual([]);
    });
  });
});
