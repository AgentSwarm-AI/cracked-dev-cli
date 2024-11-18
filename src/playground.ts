import "reflect-metadata";

import { container } from "tsyringe";
import { ProjectInfo } from "./services/LLM/utils/ProjectInfo";

const projectInfo = container.resolve(ProjectInfo);

const main = async () => {
  const info = await projectInfo.gatherProjectInfo(".");
  console.log(info);
};

void main();
