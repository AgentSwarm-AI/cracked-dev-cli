import "reflect-metadata";
import { container } from "tsyringe";
import { Run } from "../commands/run.js";
import { CrackedAgent } from "../services/CrackedAgent.js";

describe("src/index.ts", () => {
  test("should resolve a CrackedAgent instance", () => {
    const crackedAgent = container.resolve(CrackedAgent);
    expect(crackedAgent).toBeInstanceOf(CrackedAgent);
  });

  test("should export Run command", () => {
    expect(Run).toBeDefined();
  });
});
