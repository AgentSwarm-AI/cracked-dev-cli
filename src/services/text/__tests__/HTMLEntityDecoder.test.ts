import { HtmlEntityDecoder } from "../HTMLEntityDecoder";

describe("HtmlEntityDecoder", () => {
  let decoder: HtmlEntityDecoder;

  beforeEach(() => {
    decoder = new HtmlEntityDecoder();
  });

  it("should handle already decoded text", () => {
    const text = "<p>Hello & World</p>";
    const decodedText = decoder.decode(text);
    expect(decodedText).toBe("<p>Hello & World</p>");
  });

  it("should handle Unicode escape sequences", () => {
    const encodedText = "\u0048\u0065\u006C\u006C\u006F";
    const decodedText = decoder.decode(encodedText, { uneescape: true });
    expect(decodedText).toBe("Hello");
  });

  it("should return empty string for empty input", () => {
    const decodedText = decoder.decode("");
    expect(decodedText).toBe("");
  });

  it("should return empty string for empty input with uneescape option", () => {
    const decodedText = decoder.decode("", { uneescape: true });
    expect(decodedText).toBe("");
  });

  it("should handle malformed HTML entities", () => {
    const encodedText = '<p>Hello & World <a href="#">Link</a></p>';
    const decodedText = decoder.decode(encodedText);
    expect(decodedText).toBe('<p>Hello & World <a href="#">Link</a></p>');
  });

  it("should handle special characters", () => {
    const encodedText = "© ® ™";
    const decodedText = decoder.decode(encodedText);
    expect(decodedText).toBe("© ® ™");
  });

  it("should handle escaped quotes", () => {
    const encodedText = 'Text with "quoted" content';
    const decodedText = decoder.decode(encodedText, { uneescape: true });
    expect(decodedText).toBe('Text with "quoted" content');
  });
});
