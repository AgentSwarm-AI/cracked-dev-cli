// src/services/HtmlEntityDecoder.ts

import he from "he";
import { injectable } from "tsyringe";

@injectable()
export class HtmlEntityDecoder {
  /**
   * Decodes HTML entities and strips escaped characters in the provided text.
   * @param text The string containing HTML entities and escaped characters.
   * @returns The decoded and sanitized string.
   */
  decode(text: string): string {
    // Step 1: Decode HTML entities using 'he'
    const decodedText = he.decode(text);

    // Step 2: Strip escaped characters
    // This example removes backslashes and common escape sequences.
    // Adjust the regex as needed based on which escaped characters you want to remove.
    const strippedText = decodedText.replace(/\\[nrt\\'"`]/g, "");

    return strippedText;
  }
}
