import { CrackedAgent } from "@services/CrackedAgent";
import "reflect-metadata";
import { container } from "tsyringe";

export { Crkd } from "@/commands/crkd";

const crackedAgent = container.resolve(CrackedAgent);

export { crackedAgent };
