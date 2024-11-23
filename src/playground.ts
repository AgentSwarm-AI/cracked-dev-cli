import "reflect-metadata";

import { PathAdjuster } from "@services/FileManagement/PathAdjuster";
import { container } from "tsyringe";

const pathAdjuster = container.resolve(PathAdjuster);

const main = async () => {
  const info = await pathAdjuster.adjustPath("src/playground.ts");
  console.log(info);
};

void main();
