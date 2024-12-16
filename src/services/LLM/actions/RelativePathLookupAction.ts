import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import path from "path";
import { autoInjectable } from "tsyringe";
import { ActionTagsExtractor } from "./ActionTagsExtractor";
import { relativePathLookupActionBlueprint as blueprint } from "./blueprints/relativePathLookupActionBlueprint";
import { BaseAction } from "./core/BaseAction";
import { IActionBlueprint } from "./core/IAction";
import { IActionResult } from "./types/ActionTypes";

interface RelativePathLookupParams {
  source_path: string;
  path: string;
  threshold?: number;
}

@autoInjectable()
export class RelativePathLookupAction extends BaseAction {
  constructor(
    protected actionTagsExtractor: ActionTagsExtractor,
    private pathAdjuster: PathAdjuster,
  ) {
    super(actionTagsExtractor);
  }

  protected getBlueprint(): IActionBlueprint {
    return blueprint;
  }

  protected parseParams(content: string): Record<string, any> {
    // First extract the content from the outer tag
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse relative path lookup content");
      return { source_path: "", path: "", threshold: undefined };
    }

    const tagContent = match[0];
    const source_path = this.actionTagsExtractor.extractTag(
      tagContent,
      "source_path",
    );
    const path = this.actionTagsExtractor.extractTag(tagContent, "path");
    const threshold = this.actionTagsExtractor.extractTag(
      tagContent,
      "threshold",
    );

    const getValue = (value: string | string[] | null): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    };

    return {
      source_path: getValue(source_path),
      path: getValue(path),
      threshold: threshold ? parseFloat(getValue(threshold)) : undefined,
    };
  }

  protected validateParams(params: Record<string, any>): string | null {
    const { source_path, path, threshold } = params as RelativePathLookupParams;

    if (!source_path) {
      return "No source_path provided";
    }
    if (!path) {
      return "No path provided";
    }
    if (threshold !== undefined && (threshold <= 0 || threshold > 1)) {
      return "Threshold must be between 0 and 1";
    }

    return null;
  }

  protected async executeInternal(
    params: Record<string, any>,
  ): Promise<IActionResult> {
    try {
      const {
        source_path,
        path: relativePath,
        threshold = 0.6,
      } = params as RelativePathLookupParams;

      // Get the directory of the source file to resolve relative paths from
      const sourceDir = path.dirname(source_path);

      // Resolve the full path of the import relative to the source file
      const fullImportPath = path.resolve(sourceDir, relativePath);

      // Use PathAdjuster to find the correct path
      const adjustedPath = await this.pathAdjuster.adjustPath(
        fullImportPath,
        threshold,
      );

      if (adjustedPath) {
        // Convert the adjusted absolute path back to a relative path from the source file
        const newRelativePath = path.relative(sourceDir, adjustedPath);
        // Ensure proper directory separator and add ./ if needed
        const formattedPath = newRelativePath.startsWith(".")
          ? newRelativePath
          : "./" + newRelativePath;

        const result = {
          originalPath: relativePath,
          newPath: formattedPath.replace(/\\/g, "/"), // Ensure forward slashes
          absolutePath: adjustedPath,
        };

        this.logSuccess(
          `Found adjusted path: ${result.newPath} (absolute: ${result.absolutePath})`,
        );
        return this.createSuccessResult(result);
      }

      this.logInfo("No adjusted path found");
      return this.createSuccessResult(null);
    } catch (error) {
      this.logError(`Path lookup failed: ${(error as Error).message}`);
      return this.createErrorResult(error as Error);
    }
  }
}
