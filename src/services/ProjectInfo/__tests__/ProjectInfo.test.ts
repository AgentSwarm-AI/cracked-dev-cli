import fs from "fs";
import { container } from "tsyringe";
import { DirectoryScanner } from "../../../services/FileManagement/DirectoryScanner";
import { FileOperations } from "../../../services/FileManagement/FileOperations";
import { ProjectInfo } from "../ProjectInfo";

const mockFileScan = () => {
  return Promise.resolve({
    success: true,
    data: "/fake/path/package.json",
  });
};

jest.mock("../../../services/FileManagement/DirectoryScanner", () => {
  return {
    DirectoryScanner: jest.fn().mockImplementation(() => {
      return {
        scan: mockFileScan,
      };
    }),
  };
});

jest.mock("../../../services/FileManagement/FileOperations", () => {
  return {
    FileOperations: jest.fn().mockImplementation(() => ({})),
  };
});

describe("ProjectInfo", () => {
  beforeEach(() => {
    container.clearInstances();
  });

  test("should gather dependencies from package.json", async () => {
    // Register mocks with container
    container.registerInstance(DirectoryScanner, new DirectoryScanner());
    container.registerInstance(FileOperations, new FileOperations());

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
});
