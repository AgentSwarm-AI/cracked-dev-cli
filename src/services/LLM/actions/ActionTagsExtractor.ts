import { autoInjectable } from "tsyringe";
import { getBlueprint, getImplementedActions } from "./blueprints";

@autoInjectable()
export class ActionTagsExtractor {
  private getParameterTags(): string[] {
    // Get all parameter names from all action blueprints
    const paramSet = new Set<string>();
    const actionTags = getImplementedActions();

    for (const tag of actionTags) {
      const blueprint = getBlueprint(tag);
      blueprint.parameters?.forEach((param) => {
        paramSet.add(param.name);
      });
    }

    return Array.from(paramSet);
  }

  /**
   * Validates if a tag has proper XML structure
   * @param content Full text content to validate
   * @returns Message indicating if structure is valid or what's wrong
   */
  validateStructure(content: string): string {
    // Get implemented action tags dynamically
    const actionTags = getImplementedActions();

    // First validate the outer action tags
    for (const tag of actionTags) {
      const openCount = (content.match(new RegExp(`<${tag}>`, "g")) || [])
        .length;
      const closeCount = (content.match(new RegExp(`</${tag}>`, "g")) || [])
        .length;

      if (openCount !== closeCount) {
        return `We need to use proper tag structure, try again. Missing ${openCount > closeCount ? "closing" : "opening"} tag for <${tag}>.`;
      }
    }

    // Then validate inner parameter tags
    const parameterTags = this.getParameterTags();

    for (const tag of parameterTags) {
      const openCount = (content.match(new RegExp(`<${tag}>`, "g")) || [])
        .length;
      const closeCount = (content.match(new RegExp(`</${tag}>`, "g")) || [])
        .length;

      if (openCount !== closeCount) {
        return `We need to use proper tag structure, try again. Missing ${openCount > closeCount ? "closing" : "opening"} tag for <${tag}>.`;
      }
    }

    return "";
  }

  /**
   * Extracts content from a single tag
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns The content within the tag or null if not found
   */
  extractTag(content: string, tagName: string): string | string[] | null {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "g");
    const matches = Array.from(content.matchAll(regex));

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0][1].trim();
    return matches.map((match) => match[1].trim());
  }

  /**
   * Extracts content from multiple instances of the same tag
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of content within each instance of the tag
   */
  extractTags(content: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "g");
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
    if (!tagContent || Array.isArray(tagContent)) return [];

    return tagContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  /**
   * Extracts nested tags from within a parent tag
   * @param content Full text content
   * @param parentTag Parent tag name
   * @param childTag string
   * @returns Array of content within child tags, found within the parent tag
   */
  extractNestedTags(
    content: string,
    parentTag: string,
    childTag: string,
  ): string[] {
    const parentContent = this.extractTag(content, parentTag);
    if (!parentContent || Array.isArray(parentContent)) return [];

    return this.extractTags(parentContent, childTag);
  }

  /**
   * Extracts all instances of a tag with their complete content
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of complete tag contents including nested tags
   */
  extractAllTagsWithContent(content: string, tagName: string): string[] {
    const regex = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "g");
    const matches = content.match(regex);
    return matches ? matches.map((match) => match.trim()) : [];
  }
}