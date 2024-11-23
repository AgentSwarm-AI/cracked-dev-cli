import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { IActionResult } from "@services/LLM/actions/types/ActionTypes";
import path from "path";
import { autoInjectable } from "tsyringe";

@autoInjectable()
export class RelativePathLookupAction {
  constructor(private pathAdjuster: PathAdjuster) {}

  async execute(content: string): Promise<IActionResult> {
    try {
      const sourcePathMatch = /<source_path>(.*?)<\/source_path>/;
      const pathMatch = /<path>(.*?)<\/path>/;
      const thresholdMatch = /<threshold>(.*?)<\/threshold>/;

      const sourcePathResult = content.match(sourcePathMatch);
      const pathResult = content.match(pathMatch);
      const thresholdResult = content.match(thresholdMatch);

      if (!sourcePathResult) {
        return {
          success: false,
          error: new Error(
            "No source_path provided in relative_path_lookup action",
          ),
        };
      }

      if (!pathResult) {
        return {
          success: false,
          error: new Error("No path provided in relative_path_lookup action"),
        };
      }

      const sourcePath = sourcePathResult[1];
      const relativePath = pathResult[1];
      const threshold = thresholdResult ? parseFloat(thresholdResult[1]) : 0.6;

      // Get the directory of the source file to resolve relative paths from
      const sourceDir = path.dirname(sourcePath);

      // Resolve the full path of the import relative to the source file
      const fullImportPath = path.resolve(sourceDir, relativePath);

      // Use PathAdjuster to find the correct path
      const adjustedPath = await this.pathAdjuster.adjustPath(
        fullImportPath,
        threshold,
      );

      console.log("Adjusted path:", adjustedPath);

      if (adjustedPath) {
        // Convert the adjusted absolute path back to a relative path from the source file
        const newRelativePath = path.relative(sourceDir, adjustedPath);
        // Ensure proper directory separator and add ./ if needed
        const formattedPath = newRelativePath.startsWith(".")
          ? newRelativePath
          : "./" + newRelativePath;

        return {
          success: true,
          data: {
            originalPath: relativePath,
            newPath: formattedPath.replace(/\\/g, "/"), // Ensure forward slashes
            absolutePath: adjustedPath,
          },
        };
      }

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}
