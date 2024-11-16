import "reflect-metadata";

import { container } from "tsyringe";
import { DirectoryScanner } from "./services/FileManagement/DirectoryScanner";

const directoryScanner = container.resolve(DirectoryScanner);

const main = async () => {
  const output = await directoryScanner.scan(".", {
    maxDepth: 3,
    directoryFirst: true,
    ignore: [".husky", "dist"],
  });

  if (output.success && output.data) {
    console.log(output.data);
  }
};

void main();
