import { autoInjectable } from "tsyringe";

@autoInjectable()
export class Calculator {
  sum(a: number, b: number): number {
    return a + b;
  }
}
