import { ProjectInfo } from "@services/LLM/utils/ProjectInfo";
import fs from "fs";
import { container } from "tsyringe";

const mockFileScan = () => {
  return Promise.resolve({
    success: true,
    data: "/fake/path/package.json",
  });
};

jest.mock("../../../../services/FileManagement/DirectoryScanner", () => {
  return {
    DirectoryScanner: jest.fn().mockImplementation(() => {
      return {
        scan: mockFileScan,
      };
    }),
  };
});

jest.mock("../../../../services/FileManagement/FileOperations", () => {
  return {
    FileOperations: jest.fn().mockImplementation(() => ({})),
  };
});

describe("ProjectInfo", () => {
  let projectInfo: ProjectInfo;

  beforeEach(() => {
    container.clearInstances();
    projectInfo = container.resolve(ProjectInfo);
  });

  describe("package.json", () => {
    test("should gather dependencies and scripts", async () => {
      const mockPackageJson = {
        dependencies: {
          express: "^4.17.1",
          lodash: "^4.17.21",
        },
        devDependencies: {
          jest: "^27.0.0",
        },
        scripts: {
          start: "node index.js",
          test: "jest",
        },
      };

      jest
        .spyOn(fs.promises, "readFile")
        .mockResolvedValue(JSON.stringify(mockPackageJson));

      const mockDirent = {
        name: "package.json",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["express", "lodash", "jest"],
        scripts: {
          start: "node index.js",
          test: "jest",
        },
        dependencyFile: "package.json",
      });
    });

    test("should handle missing sections", async () => {
      const mockPackageJson = {
        scripts: {},
      };

      jest
        .spyOn(fs.promises, "readFile")
        .mockResolvedValue(JSON.stringify(mockPackageJson));

      const mockDirent = {
        name: "package.json",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {},
        dependencyFile: "package.json",
      });
    });
  });

  describe("requirements.txt", () => {
    test("should gather dependencies", async () => {
      const mockRequirementsTxt = `
        Flask==2.0.1
        requests==2.26.0
        # Comment
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockRequirementsTxt);

      const mockDirent = {
        name: "requirements.txt",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["Flask", "requests"],
        scripts: {},
        dependencyFile: "requirements.txt",
      });
    });

    test("should handle empty file", async () => {
      jest.spyOn(fs.promises, "readFile").mockResolvedValue("");

      const mockDirent = {
        name: "requirements.txt",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {},
        dependencyFile: "requirements.txt",
      });
    });
  });

  describe("Cargo.toml", () => {
    test("should gather dependencies and scripts", async () => {
      const mockCargoToml = `
        [dependencies]
        serde = { version = "1.0", features = ["derive"] }
        actix-web = "4.0"
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockCargoToml);

      const mockDirent = {
        name: "Cargo.toml",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["serde", "actix-web"],
        scripts: {
          build: "cargo build",
          run: "cargo run",
          test: "cargo test",
        },
        dependencyFile: "Cargo.toml",
      });
    });

    test("should handle missing dependencies section", async () => {
      const mockCargoToml = `
        [package]
        name = "test"
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockCargoToml);

      const mockDirent = {
        name: "Cargo.toml",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {
          build: "cargo build",
          run: "cargo run",
          test: "cargo test",
        },
        dependencyFile: "Cargo.toml",
      });
    });
  });

  describe("go.mod", () => {
    test("should gather dependencies", async () => {
      const mockGoMod = `
        module example.com/yourmodule

        go 1.17

        require (
          github.com/gorilla/mux v1.8.0
          github.com/stretchr/testify v1.7.2
        )
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockGoMod);

      const mockDirent = {
        name: "go.mod",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [
          "github.com/gorilla/mux",
          "github.com/stretchr/testify",
        ],
        scripts: {
          build: "go build",
          run: "go run .",
          test: "go test ./...",
        },
        dependencyFile: "go.mod",
      });
    });

    test("should handle comments and empty lines", async () => {
      const mockGoMod = `
        // Comment
        module example.com/yourmodule

        go 1.17

        require (
          // Another comment
          github.com/gorilla/mux v1.8.0
        )
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockGoMod);

      const mockDirent = {
        name: "go.mod",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["github.com/gorilla/mux"],
        scripts: {
          build: "go build",
          run: "go run .",
          test: "go test ./...",
        },
        dependencyFile: "go.mod",
      });
    });
  });

  describe("pyproject.toml", () => {
    test("should gather dependencies", async () => {
      const mockPyprojectToml = `
        [tool.poetry.dependencies]
        flask = "^2.0.1"
        requests = "^2.26.0"
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockPyprojectToml);

      const mockDirent = {
        name: "pyproject.toml",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["flask", "requests"],
        scripts: {},
        dependencyFile: "pyproject.toml",
      });
    });

    test("should handle missing dependencies section", async () => {
      const mockPyprojectToml = `
        [tool.poetry]
        name = "test"
      `;

      jest.spyOn(fs.promises, "readFile").mockResolvedValue(mockPyprojectToml);

      const mockDirent = {
        name: "pyproject.toml",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {},
        dependencyFile: "pyproject.toml",
      });
    });
  });

  describe("composer.json", () => {
    test("should gather dependencies", async () => {
      const mockComposerJson = {
        require: {
          "monolog/monolog": "^2.0",
          "guzzlehttp/guzzle": "^7.0",
        },
      };

      jest
        .spyOn(fs.promises, "readFile")
        .mockResolvedValue(JSON.stringify(mockComposerJson));

      const mockDirent = {
        name: "composer.json",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: ["monolog/monolog", "guzzlehttp/guzzle"],
        scripts: {},
        dependencyFile: "composer.json",
      });
    });

    test("should handle missing require section", async () => {
      const mockComposerJson = {
        name: "test",
      };

      jest
        .spyOn(fs.promises, "readFile")
        .mockResolvedValue(JSON.stringify(mockComposerJson));

      const mockDirent = {
        name: "composer.json",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {},
        dependencyFile: "composer.json",
      });
    });
  });

  describe("Unrecognized Files", () => {
    test("should return empty result for unrecognized file", async () => {
      jest.spyOn(fs.promises, "readFile").mockResolvedValue("");

      const mockDirent = {
        name: "unrecognized.txt",
        isFile: () => true,
      } as fs.Dirent;

      jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

      const result = await projectInfo.gatherProjectInfo("/fake/path");

      expect(result).toEqual({
        mainDependencies: [],
        scripts: {},
      });
    });
  });
});