import { container } from "tsyringe";
import { Calculator } from "./Calculator";

describe("Calculator", () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = container.resolve(Calculator);
  });

  describe("sum", () => {
    it("should add two positive numbers correctly", () => {
      expect(calculator.sum(1, 2)).toBe(3);
      expect(calculator.sum(5, 3)).toBe(8);
    });

    it("should handle negative numbers", () => {
      expect(calculator.sum(-1, 1)).toBe(0);
      expect(calculator.sum(-2, -3)).toBe(-5);
    });

    it("should handle zero", () => {
      expect(calculator.sum(0, 0)).toBe(0);
      expect(calculator.sum(5, 0)).toBe(5);
      expect(calculator.sum(0, 5)).toBe(5);
    });

    it("should handle decimal numbers", () => {
      expect(calculator.sum(0.1, 0.2)).toBeCloseTo(0.3);
      expect(calculator.sum(1.5, 2.7)).toBeCloseTo(4.2);
    });
  });
});
