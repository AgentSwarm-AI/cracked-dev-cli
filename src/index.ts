import "reflect-metadata";
import { container } from "tsyringe";
import { CrackedAgent } from "./services/CrackedAgent.js";

export { Crkd } from "./commands/crkd.js";

const crackedAgent = container.resolve(CrackedAgent);

export { crackedAgent };
