// src/services/HtmlEntityDecoder.ts

import he from "he";
import { injectable } from "tsyringe";

interface IHtmlEntityDecoderOptions {
  uneescape?: boolean;
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

    // Step 1: Decode HTML entities
    const decodedHtml = he.decode(text);

    if (options?.uneescape) {
      // Step 2: Unescape backslash-escaped characters
      return this.unescapeString(decodedHtml);
    }

    return decodedHtml;
  }

  /**
   * Unescapes common backslash-escaped characters in a string.
   * @param str The string with escaped characters.
   * @returns The unescaped string.
   */
  public unescapeString(str: string): string {
    return str.replace(/\\(["'\\/bfnrt]|u[0-9a-fA-F]{4})/g, (match, p1) => {
      switch (p1) {
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
          if (p1.startsWith("u")) {
            // Handle Unicode escape sequences
            const code = parseInt(p1.slice(1), 16);
            return String.fromCharCode(code);
          }
          return match; // Return the original match if not recognized
      }
    });
  }
}
