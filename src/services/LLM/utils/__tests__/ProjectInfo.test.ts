import fs from "fs";
import { container } from "tsyringe";
import { ProjectInfo } from "../ProjectInfo";

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
  beforeEach(() => {
    container.clearInstances();
  });

  test("should gather dependencies from package.json", async () => {
    // Get ProjectInfo instance from container
    const projectInfo = container.resolve(ProjectInfo);

    // Mock fs.promises.readFile for package.json
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

    // Create a mock Dirent object
    const mockDirent = {
      name: "package.json",
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
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

  test("should gather dependencies from requirements.txt", async () => {
    // Get ProjectInfo instance from container
    const projectInfo = container.resolve(ProjectInfo);

    // Mock fs.promises.readFile for requirements.txt
    const mockRequirementsTxt = `
      Flask==2.0.1
      requests==2.26.0
      # Comment
    `;

    jest
      .spyOn(fs.promises, "readFile")
      .mockResolvedValue(mockRequirementsTxt);

    // Create a mock Dirent object
    const mockDirent = {
      name: "requirements.txt",
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as fs.Dirent;

    jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

    const result = await projectInfo.gatherProjectInfo("/fake/path");

    expect(result).toEqual({
      mainDependencies: ["Flask", "requests"],
      scripts: {},
      dependencyFile: "requirements.txt",
    });
  });

  test("should gather dependencies from Cargo.toml", async () => {
    // Get ProjectInfo instance from container
    const projectInfo = container.resolve(ProjectInfo);

    // Mock fs.promises.readFile for Cargo.toml
    const mockCargoToml = `
      [dependencies]
      serde = { version = "1.0", features = ["derive"] }
      actix-web = "4.0"
    `;

    jest
      .spyOn(fs.promises, "readFile")
      .mockResolvedValue(mockCargoToml);

    // Create a mock Dirent object
    const mockDirent = {
      name: "Cargo.toml",
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
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

  test("should gather dependencies from go.mod", async () => {
    // Get ProjectInfo instance from container
    const projectInfo = container.resolve(ProjectInfo);

    // Mock fs.promises.readFile for go.mod
    const mockGoMod = `
      module example.com/yourmodule

      go 1.17

      require (
        github.com/gorilla/mux v1.8.0
        github.com/stretchr/testify v1.7.2
      )
    `;

    jest
      .spyOn(fs.promises, "readFile")
      .mockResolvedValue(mockGoMod);

    // Create a mock Dirent object
    const mockDirent = {
      name: "go.mod",
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as fs.Dirent;

    jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

    const result = await projectInfo.gatherProjectInfo("/fake/path");

    expect(result).toEqual({
      mainDependencies: ["github.com/gorilla/mux", "github.com/stretchr/testify"],
      scripts: {
        build: "go build",
        run: "go run .",
        test: "go test ./...",
      },
      dependencyFile: "go.mod",
    });
  });

  test("should return empty dependencies when no recognized file is found", async () => {
    // Get ProjectInfo instance from container
    const projectInfo = container.resolve(ProjectInfo);

    // Mock fs.promises.readFile without any recognizable dependency file
    jest.spyOn(fs.promises, "readFile").mockResolvedValue("");

    // Create a mock Dirent object with unrecognized file
    const mockDirent = {
      name: "unrecognized.txt",
      isFile: () => true,
      isDirectory: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as fs.Dirent;

    jest.spyOn(fs.promises, "readdir").mockResolvedValue([mockDirent]);

    const result = await projectInfo.gatherProjectInfo("/fake/path");

    expect(result).toEqual({
      mainDependencies: [],
      scripts: {},
    });
  });
});