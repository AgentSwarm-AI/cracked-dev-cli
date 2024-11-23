import he from "he";
import { injectable } from "tsyringe";

interface IHtmlEntityDecoderOptions {
  unescape?: boolean;
}

@injectable()
export class HtmlEntityDecoder {
  /**
   * Decodes HTML entities and cleans up character escaping in the provided text.
   * @param text The string containing HTML entities and escaped characters.
   * @returns The decoded and unescaped string.
   */
  decode(text: string, options?: IHtmlEntityDecoderOptions): string {
    if (!text) {
      return "";
    }

    let result = text;
    
    if (options?.unescape) {
      // Step 1: Unescape backslash-escaped characters
      result = this.unescapeString(result);
    }

    // Step 2: Decode HTML entities
    return he.decode(result);
  }

  /**
   * Unescapes common backslash-escaped characters in a string.
   * @param str The string with escaped characters.
   * @returns The unescaped string.
   */
  private unescapeString(str: string): string {
    return str.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (match, unicode, char) => {
      if (unicode) {
        // Handle Unicode escape sequences
        const code = parseInt(unicode, 16);
        return String.fromCharCode(code);
      }

      // Handle other escaped characters
      switch (char) {
        case '"':
          return '"';
        case "'":
          return "'";
        case "\\":
          return "\\";
        case "/":
          return "/";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        default:
          // For any other escaped character, just return the character itself
          return char;
      }
    });
  }
}