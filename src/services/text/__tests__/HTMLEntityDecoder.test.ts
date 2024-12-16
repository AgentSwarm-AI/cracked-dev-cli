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

    it("should only unescape specified characters", () => {
      const input = 'Hello \\n\\t World \\"';
      const expectedOutput = 'Hello \n\\t World \\"'; // \t remains escaped
      expect(
        decoder.decode(input, { unescape: true, unescapeChars: ["n"] }),
      ).toBe(expectedOutput);
    });

    it("should handle multiple specified characters", () => {
      const input = 'Hello \\n\\t\\r World \\"';
      const expectedOutput = 'Hello \n\t\r World \\"';
      expect(
        decoder.decode(input, {
          unescape: true,
          unescapeChars: ["n", "t", "r"],
        }),
      ).toBe(expectedOutput);
    });

    it("should unescape quotes when specified in unescapeChars without unescape option", () => {
      const input =
        'import { MessageConversationLogger } from \\"../MessageConversationLogger\\";';
      const expectedOutput =
        'import { MessageConversationLogger } from "../MessageConversationLogger";';
      expect(decoder.decode(input, { unescapeChars: ['"'] })).toBe(
        expectedOutput,
      );
    });

    it("should handle escaped quotes in complex import statements", () => {
      const input =
        'import { MessageConversationLogger } from \\"../MessageConversationLogger\\";\nimport { ConfigService } from \\"@services/ConfigService\\";';
      const expectedOutput =
        'import { MessageConversationLogger } from "../MessageConversationLogger";\nimport { ConfigService } from "@services/ConfigService";';
      expect(decoder.decode(input, { unescapeChars: ['"'] })).toBe(
        expectedOutput,
      );
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

    it("should only unescape specified characters when provided", () => {
      const input = 'Hello \\n\\t World \\"';
      const expectedOutput = 'Hello \n\\t World \\"'; // Only \n is unescaped
      // @ts-ignore
      expect(decoder.unescapeString(input, ["n"])).toBe(expectedOutput);
    });

    it("should properly unescape quotes when specified", () => {
      const input = 'import { Test } from \\"./test\\";';
      const expectedOutput = 'import { Test } from "./test";';
      // @ts-ignore
      expect(decoder.unescapeString(input, ['"'])).toBe(expectedOutput);
    });
  });
});
