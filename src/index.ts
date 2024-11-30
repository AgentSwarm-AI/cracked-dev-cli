import { CrackedAgent } from "@services/CrackedAgent";
import "reflect-metadata";
import { container } from "tsyringe";

export { Run } from "./commands/run";

const crackedAgent = container.resolve(CrackedAgent);

export { crackedAgent };
