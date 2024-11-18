import fs from "fs";
import path from "path";
import { autoInjectable } from "tsyringe";

export interface IProjectInfo {
  mainDependencies: string[];
  scripts: Record<string, string>;
  dependencyFile?: string;
}

@autoInjectable()
export class ProjectInfo {
  constructor() {}

  async gatherProjectInfo(projectRoot: string): Promise<IProjectInfo> {
    const files = await fs.promises.readdir(projectRoot, {
      withFileTypes: true,
    });
    const dependencyFiles = [
      "package.json",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
      "pom.xml",
      "composer.json",
      "pyproject.toml",
    ];

    const foundDependencyFile = dependencyFiles.find((depFile) =>
      files.some((dirent) => dirent.isFile() && dirent.name === depFile),
    );

    if (!foundDependencyFile) {
      return {
        mainDependencies: [],
        scripts: {},
      };
    }

    switch (foundDependencyFile) {
      case "package.json":
        return this.gatherNodeInfo(projectRoot, foundDependencyFile);
      case "requirements.txt":
      case "pyproject.toml":
        return this.gatherPythonInfo(projectRoot, foundDependencyFile);
      case "Cargo.toml":
        return this.gatherRustInfo(projectRoot, foundDependencyFile);
      case "go.mod":
        return this.gatherGoInfo(projectRoot, foundDependencyFile);
      default:
        return {
          mainDependencies: [],
          scripts: {},
          dependencyFile: foundDependencyFile,
        };
    }
  }

  private async gatherNodeInfo(
    projectRoot: string,
    dependencyFile: string,
  ): Promise<IProjectInfo> {
    try {
      const packageJsonPath = path.join(projectRoot, dependencyFile);
      const content = await fs.promises.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content);

      return {
        mainDependencies: [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {}),
        ],
        scripts: packageJson.scripts || {},
        dependencyFile,
      };
    } catch {
      return { mainDependencies: [], scripts: {}, dependencyFile };
    }
  }

  private async gatherPythonInfo(
    projectRoot: string,
    dependencyFile: string,
  ): Promise<IProjectInfo> {
    try {
      let dependencies: string[] = [];
      const reqPath = path.join(projectRoot, dependencyFile);
      const content = await fs.promises.readFile(reqPath, "utf-8");

      if (dependencyFile === "requirements.txt") {
        dependencies = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
          .map((line) => line.split("==")[0]);
      }

      return {
        mainDependencies: dependencies,
        scripts: {},
        dependencyFile,
      };
    } catch {
      return { mainDependencies: [], scripts: {}, dependencyFile };
    }
  }

  private async gatherRustInfo(
    projectRoot: string,
    dependencyFile: string,
  ): Promise<IProjectInfo> {
    try {
      const cargoPath = path.join(projectRoot, dependencyFile);
      const content = await fs.promises.readFile(cargoPath, "utf-8");

      const dependencies: string[] = [];
      let inDepsSection = false;

      content.split("\n").forEach((line) => {
        if (line.trim().startsWith("[dependencies]")) {
          inDepsSection = true;
        } else if (line.trim().startsWith("[")) {
          inDepsSection = false;
        } else if (inDepsSection && line.includes("=")) {
          const dep = line.split("=")[0].trim();
          dependencies.push(dep);
        }
      });

      return {
        mainDependencies: dependencies,
        scripts: {
          build: "cargo build",
          run: "cargo run",
          test: "cargo test",
        },
        dependencyFile,
      };
    } catch {
      return { mainDependencies: [], scripts: {}, dependencyFile };
    }
  }

  private async gatherGoInfo(
    projectRoot: string,
    dependencyFile: string,
  ): Promise<IProjectInfo> {
    try {
      const modPath = path.join(projectRoot, dependencyFile);
      const content = await fs.promises.readFile(modPath, "utf-8");

      const dependencies = content
        .split("\n")
        .filter((line) => line.startsWith("require "))
        .map((line) => line.replace("require ", "").trim());

      return {
        mainDependencies: dependencies,
        scripts: {
          build: "go build",
          run: "go run .",
          test: "go test ./...",
        },
        dependencyFile,
      };
    } catch {
      return { mainDependencies: [], scripts: {}, dependencyFile };
    }
  }
}
