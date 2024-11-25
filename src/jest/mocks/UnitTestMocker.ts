/* eslint-disable @typescript-eslint/ban-ts-comment */
// UnitTestMocker.ts
type MockedMethod<T> = jest.SpyInstance<Promise<T>>;

export class UnitTestMocker {
  private classMocks: Map<any, MockedMethod<any>[]> = new Map();
  private functionMocks: Map<any, jest.SpyInstance<any>[]> = new Map();

  spyOnPrototypeMethod<T, R>(
    Class: new (...args: any[]) => T,
    method: keyof T,
  ): jest.SpyInstance<R> {
    const spy = jest.spyOn(Class.prototype, method as string);

    if (!this.functionMocks.has(module)) {
      this.functionMocks.set(module, []);
    }
    this.functionMocks.get(module)?.push(spy);

    return spy;
  }

  /**
   * Spies on a prototype method of a class and mocks its return value.
   * Automatically detects if the method returns a Promise and uses the appropriate mock.
   * @param Class The class constructor.
   * @param method The method name to spy on.
   * @param returnValue The value to return when the method is called.
   * @returns The jest spy instance.
   */
  spyOnPrototypeAndReturn<T, R>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    returnValue: R,
  ): jest.SpyInstance<R> {
    const prototype = Class.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
    const isAsync =
      descriptor?.value?.constructor?.name === "AsyncFunction" ||
      returnValue instanceof Promise;

    const spy = jest.spyOn(prototype, method as string);
    if (isAsync) {
      spy.mockResolvedValue(returnValue);
    } else {
      spy.mockReturnValue(returnValue);
    }

    if (!this.classMocks.has(Class)) {
      this.classMocks.set(Class, []);
    }
    this.classMocks.get(Class)?.push(spy);

    return spy;
  }

  /**
   * Spies on a prototype method of a class and mocks its implementation.
   * @param Class The class constructor.
   * @param method The method name to spy on.
   * @param implementation The implementation function to use when the method is called.
   * @returns The jest spy instance.
   */
  spyOnPrototypeWithImplementation<T>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    implementation: (...args: any[]) => any,
  ): jest.SpyInstance {
    const spy = jest
      .spyOn(Class.prototype, method as string)
      .mockImplementation(implementation);

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
