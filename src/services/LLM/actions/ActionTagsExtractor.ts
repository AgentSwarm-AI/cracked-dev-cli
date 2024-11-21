import { autoInjectable } from "tsyringe";

@autoInjectable()
export class ActionTagsExtractor {
  private replaceContentBlocks(content: string): {
    processedContent: string;
    replacements: { placeholder: string; original: string }[];
  } {
    const replacements: { placeholder: string; original: string }[] = [];
    let processedContent = content;

    // Only replace content blocks that are not within write_file tags
    const writeFileBlocks =
      processedContent.match(/<write_file>[\s\S]*?<\/write_file>/g) || [];
    const readFileBlocks =
      processedContent.match(/<read_file>[\s\S]*?<\/read_file>/g) || [];

    // Preserve write_file and read_file blocks by temporarily replacing them
    let counter = 0;
    [...writeFileBlocks, ...readFileBlocks].forEach((block) => {
      const placeholder = `__CONTENT_BLOCK_${counter}__`;
      replacements.push({ placeholder, original: block });
      processedContent = processedContent.replace(block, placeholder);
      counter++;
    });

    return { processedContent, replacements };
  }

  private restoreContentBlocks(
    content: string,
    replacements: { placeholder: string; original: string }[],
  ): string {
    let restoredContent = content;
    for (const { placeholder, original } of replacements) {
      restoredContent = restoredContent.replace(placeholder, original);
    }
    return restoredContent;
  }

  /**
   * Validates if a tag has proper XML structure
   * @param content Full text content to validate
   * @returns Message indicating if structure is valid or what's wrong
   */
  validateStructure(content: string): string {
    const { processedContent } = this.replaceContentBlocks(content);

    const actionTags = [
      "read_file",
      "write_file",
      "delete_file",
      "move_file",
      "copy_file_slice",
      "execute_command",
      "search_string",
      "search_file",
      "end_task",
      "fetch_url",
      "edit_file",
      "relative_path_lookup",
    ];

    for (const tag of actionTags) {
      const openCount = (
        processedContent.match(new RegExp(`<${tag}>`, "g")) || []
      ).length;
      const closeCount = (
        processedContent.match(new RegExp(`</${tag}>`, "g")) || []
      ).length;

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
  extractTag(content: string, tagName: string): string | null {
    if (tagName === "write_file") {
      const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
      const match = content.match(regex);
      return match ? match[1].trim() : null;
    }

    const { processedContent, replacements } =
      this.replaceContentBlocks(content);
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
    const match = processedContent.match(regex);
    if (!match) return null;

    return this.restoreContentBlocks(match[1], replacements).trim();
  }

  /**
   * Extracts content from multiple instances of the same tag
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of content within each instance of the tag
   */
  extractTags(content: string, tagName: string): string[] {
    if (tagName === "write_file") {
      const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "g");
      const matches = content.matchAll(regex);
      return Array.from(matches).map((match) => match[1].trim());
    }

    const { processedContent, replacements } =
      this.replaceContentBlocks(content);
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "g");
    const matches = processedContent.matchAll(regex);
    return Array.from(matches).map((match) =>
      this.restoreContentBlocks(match[1], replacements).trim(),
    );
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
   * @param childTag string
   * @returns Array of content within child tags, found within the parent tag
   */
  extractNestedTags(
    content: string,
    parentTag: string,
    childTag: string,
  ): string[] {
    if (childTag === "write_file") {
      const parentContent = this.extractTag(content, parentTag);
      if (!parentContent) return [];

      const regex = new RegExp(
        `<${childTag}>([\\s\\S]*?)<\\/${childTag}>`,
        "g",
      );
      const matches = parentContent.matchAll(regex);
      return Array.from(matches).map((match) => match[1].trim());
    }

    const { processedContent, replacements } =
      this.replaceContentBlocks(content);
    const parentContent = this.extractTag(processedContent, parentTag);
    if (!parentContent) return [];

    return this.extractTags(
      this.restoreContentBlocks(parentContent, replacements),
      childTag,
    );
  }

  /**
   * Extracts all instances of a tag with their complete content
   * @param content Full text content
   * @param tagName Name of the tag to extract
   * @returns Array of complete tag contents including nested tags
   */
  extractAllTagsWithContent(content: string, tagName: string): string[] {
    if (tagName === "write_file") {
      const regex = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, "g");
      const matches = content.match(regex);
      return matches ? matches.map((match) => match.trim()) : [];
    }

    const { processedContent, replacements } =
      this.replaceContentBlocks(content);
    const regex = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`, "g");
    const matches = processedContent.match(regex);
    return matches
      ? matches.map((match) =>
          this.restoreContentBlocks(match, replacements).trim(),
        )
      : [];
  }
}
