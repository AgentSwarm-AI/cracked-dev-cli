import he from "he";
import { injectable } from "tsyringe";

interface IHtmlEntityDecoderOptions {
  unescape?: boolean;
  unescapeChars?: string[];
}

@injectable()
export class HtmlEntityDecoder {
  /**
   * Decodes HTML entities and cleans up character escaping in the provided text.
   * @param text The string containing HTML entities and escaped characters.
   * @param options Configuration options for decoding
   * @returns The decoded and unescaped string.
   */
  decode(text: string, options?: IHtmlEntityDecoderOptions): string {
    if (!text) {
      return "";
    }

    let result = text;

    // Always unescape if unescapeChars are provided, regardless of unescape option
    if (options?.unescapeChars?.length || options?.unescape) {
      result = this.unescapeString(result, options?.unescapeChars);
    }

    // Step 2: Decode HTML entities
    return he.decode(result);
  }

  /**
   * Unescapes specific backslash-escaped characters in a string.
   * @param str The string with escaped characters.
   * @param chars Optional array of specific characters to unescape
   * @returns The unescaped string.
   */
  private unescapeString(str: string, chars?: string[]): string {
    return str.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (match, unicode, char) => {
      if (unicode) {
        // Handle Unicode escape sequences
        const code = parseInt(unicode, 16);
        return String.fromCharCode(code);
      }

      // Special characters map for escaped sequences
      const specialCharMap: { [key: string]: string } = {
        n: "\n",
        t: "\t",
        r: "\r",
        b: "\b",
        f: "\f",
        '"': '"',
        "'": "'",
        "\\": "\\",
        "/": "/",
      };

      // If specific chars are provided, only unescape those
      if (chars) {
        return chars.includes(char) ? specialCharMap[char] || char : match;
      }

      // Handle other escaped characters when no specific chars are provided
      return specialCharMap[char] || char;
    });
  }
}
