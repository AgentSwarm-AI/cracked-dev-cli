/* eslint-disable @typescript-eslint/ban-ts-comment */
// UnitTestMocker.ts
type MockedMethod<T> = jest.SpyInstance<Promise<T>>;

export class UnitTestMocker {
  private classMocks: Map<any, MockedMethod<any>[]> = new Map();
  private functionMocks: Map<any, jest.SpyInstance<any>[]> = new Map();

  /**
   * Spies on a prototype method of a class and mocks its return value.
   * @param Class The class constructor.
   * @param method The method name to spy on.
   * @param returnValue The value to return when the method is called.
   * @returns The jest spy instance.
   */
  spyOnPrototype<T, R>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    returnValue: R,
  ): MockedMethod<R> {
    const spy = jest
      .spyOn(Class.prototype, method as string)
      .mockResolvedValue(returnValue);

    if (!this.classMocks.has(Class)) {
      this.classMocks.set(Class, []);
    }
    this.classMocks.get(Class)?.push(spy);

    return spy;
  }

  /**
   * Spies on a module function and mocks its return value.
   * @param module The module object containing the function.
   * @param method The function name to spy on.
   * @param returnValue The value to return when the function is called.
   * @returns The jest spy instance.
   */
  spyOnModuleFunction<T, R>(
    module: T,
    method: keyof T,
    returnValue: R,
  ): jest.SpyInstance<R> {
    const spy = jest
      //@ts-ignore
      .spyOn(module, method as string)
      //@ts-ignore
      .mockReturnValue(returnValue);

    if (!this.functionMocks.has(module)) {
      this.functionMocks.set(module, []);
    }
    this.functionMocks.get(module)?.push(spy);

    return spy;
  }

  /**
   * Clears all mocks set up by spyOnPrototype and spyOnFunction.
   */
  clearAllMocks(): void {
    this.classMocks.forEach((spies) => {
      spies.forEach((spy) => spy.mockClear());
    });

    this.functionMocks.forEach((spies) => {
      spies.forEach((spy) => spy.mockClear());
    });
  }
}
