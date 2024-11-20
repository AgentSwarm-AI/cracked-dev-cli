import "reflect-metadata";

import { container } from "tsyringe";
import { PathAdjuster } from "./services/FileManagement/PathAdjuster";

const pathAdjuster = container.resolve(PathAdjuster);

const main = async () => {
  const info = await pathAdjuster.adjustPath("src/playground.ts");
  console.log(info);
};

void main();
