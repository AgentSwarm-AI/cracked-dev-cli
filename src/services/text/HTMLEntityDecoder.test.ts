import { HtmlEntityDecoder } from "./HTMLEntityDecoder";

describe("HtmlEntityDecoder", () => {
  let decoder: HtmlEntityDecoder;

  beforeEach(() => {
    decoder = new HtmlEntityDecoder();
  });

  it("should decode HTML entities", () => {
    const encodedText = "<p>Hello &amp; World</p>";
    const decodedText = decoder.decode(encodedText);
    expect(decodedText).toBe("<p>Hello & World</p>");
  });

  it("should handle already decoded text", () => {
    const text = "<p>Hello & World</p>";
    const decodedText = decoder.decode(text);
    expect(decodedText).toBe("<p>Hello & World</p>");
  });

  it("should decode multiple HTML entities", () => {
    const encodedText = '<p>Hello &amp; World <a href="#">Link</a></p>';
    const decodedText = decoder.decode(encodedText);
    expect(decodedText).toBe('<p>Hello & World <a href="#">Link</a></p>');
  });
});
