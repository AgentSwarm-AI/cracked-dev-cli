import 'reflect-metadata';
import { autoInjectable } from 'tsyringe';

@autoInjectable()
class Calculator {
  sum(a: number, b: number): number {
    return a + b;
  }
}

const calculator = new Calculator();

export const sum = (a: number, b: number): number => {
  return calculator.sum(a, b);
};
