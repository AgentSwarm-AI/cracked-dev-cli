/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HtmlEntityDecoder } from "../HTMLEntityDecoder";

describe("HtmlEntityDecoder", () => {
  let decoder: HtmlEntityDecoder;

  beforeEach(() => {
    decoder = new HtmlEntityDecoder();
  });

  describe("decode method", () => {
    it("should decode HTML entities", () => {
      const input = "<p>Hello & World</p>";
      const expectedOutput = "<p>Hello & World</p>";
      expect(decoder.decode(input)).toBe(expectedOutput);
    });

    it("should decode HTML entities and unescape backslash-escaped characters", () => {
      const input = "<p>Hello \\& World</p>";
      const expectedOutput = "<p>Hello & World</p>";
      expect(decoder.decode(input, { unescape: true })).toBe(expectedOutput);
    });

    it("should return an empty string if input is empty", () => {
      expect(decoder.decode("")).toBe("");
    });

    it("should handle Unicode escape sequences", () => {
      const input = "<p>Hello \\u0026 World</p>";
      const expectedOutput = "<p>Hello & World</p>";
      expect(decoder.decode(input, { unescape: true })).toBe(expectedOutput);
    });
  });

  describe("unescapeString method", () => {
    it("should unescape backslash-escaped characters", () => {
      const input = "Hello \\& World";
      const expectedOutput = "Hello & World";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(expectedOutput);
    });

    it("should handle Unicode escape sequences", () => {
      const input = "Hello \\u0026 World";
      const expectedOutput = "Hello & World";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(expectedOutput);
    });

    it("should return the original string if no escape sequences are found", () => {
      const input = "Hello & World";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(input);
    });

    it("should handle multiple escape sequences", () => {
      const input = "Hello \\n\\t\\r\\b\\f World";
      const expectedOutput = "Hello \n\t\r\b\f World";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(expectedOutput);
    });

    it("should handle escaped quotes", () => {
      const input = "Hello \\' World \\\"";
      const expectedOutput = "Hello ' World \"";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(expectedOutput);
    });

    it("should handle escaped slashes", () => {
      const input = "Hello \\\\ World \\/";
      const expectedOutput = "Hello \\ World /";
      // @ts-ignore
      expect(decoder.unescapeString(input)).toBe(expectedOutput);
    });
  });
});
