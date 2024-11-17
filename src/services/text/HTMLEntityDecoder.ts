// src/services/HtmlEntityDecoder.ts

import he from "he";
import { injectable } from "tsyringe";

@injectable()
export class HtmlEntityDecoder {
  /**
   * Decodes HTML entities in the provided text.
   * @param text The string containing HTML entities.
   * @returns The decoded string.
   */
  decode(text: string): string {
    return he.decode(text);
  }
}
