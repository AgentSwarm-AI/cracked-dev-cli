/* eslint-disable no-control-regex */

import { autoInjectable } from "tsyringe";

/**
 * AnsiStripper Class
 *
 * This class provides functionality to remove ANSI escape codes from strings.
 */
@autoInjectable()
export class AnsiStripper {
  // Regular expression to match ANSI escape codes
  private static readonly ansiRegex: RegExp = /\x1B\[[0-?]*[ -/]*[@-~]/g;

  /**
   * Strips ANSI escape codes from the input string.
   *
   * @param input - The string potentially containing ANSI escape codes.
   * @returns The cleaned string without ANSI codes.
   */
  public strip(input: string): string {
    if (typeof input !== "string") {
      throw new TypeError("Input must be a string");
    }
    return input.replace(AnsiStripper.ansiRegex, "");
  }
}
