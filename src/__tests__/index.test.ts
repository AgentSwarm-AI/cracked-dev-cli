import "reflect-metadata";
import { container } from "tsyringe";
import { CrackedAgent } from "../services/CrackedAgent.js";
import { Crkd } from "../commands/crkd.js";

describe("src/index.ts", () => {
  test("should resolve a CrackedAgent instance", () => {
    const crackedAgent = container.resolve(CrackedAgent);
    expect(crackedAgent).toBeInstanceOf(CrackedAgent);
  });

  test("should export Crkd command", () => {
    expect(Crkd).toBeDefined();
  });
});