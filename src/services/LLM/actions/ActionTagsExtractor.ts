import { autoInjectable } from "tsyringe";

@autoInjectable()
export class ActionTagsExtractor {
  /**
   * Extracts content from a single tag
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns The content within the tag or null if not found
   */
  extractTag(content: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extracts content from multiple instances of the same tag
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of content within each instance of the tag
   */
  extractTags(content: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "g");
    const matches = content.matchAll(regex);
    return Array.from(matches).map((match) => match[1].trim());
  }

  /**
   * Extracts content from a tag and splits it into lines
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of non-empty trimmed lines from the tag content
   */
  extractTagLines(content: string, tagName: string): string[] {
    const tagContent = this.extractTag(content, tagName);
    if (!tagContent) return [];

    return tagContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  /**
   * Extracts nested tags from within a parent tag
   * @param content Full text content
   * @param parentTag Parent tag name
   * @param childTag Child tag name
   * @returns Array of content within child tags, found within the parent tag
   */
  extractNestedTags(
    content: string,
    parentTag: string,
    childTag: string,
  ): string[] {
    const parentContent = this.extractTag(content, parentTag);
    if (!parentContent) return [];

    return this.extractTags(parentContent, childTag);
  }

  /**
   * Extracts all instances of a tag with their complete content
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of complete tag contents including nested tags
   */
  extractAllTagsWithContent(content: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, "g");
    const matches = content.match(regex);
    return matches ? matches.map((match) => match.trim()) : [];
  }
}
