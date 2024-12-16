/* eslint-disable @typescript-eslint/ban-ts-comment */
// UnitTestMocker.ts

export class UnitTestMocker {
  private classMocks: Map<any, jest.SpyInstance<any>[]> = new Map();
  private moduleMocks: Map<any, jest.SpyInstance<any>[]> = new Map();

  spyPrototype<T, Return>(
    Class: new (...args: any[]) => T,
    method: keyof T,
  ): jest.SpyInstance<Return> {
    const spy = jest.spyOn(Class.prototype, method as string);

    if (!this.moduleMocks.has(Class)) {
      this.moduleMocks.set(Class, []);
    }
    this.moduleMocks.get(Class)?.push(spy);

    return spy;
  }

  mockPrototype<T, Return>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    returnValue: Return,
  ): jest.SpyInstance<Return> {
    const prototype = Class.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
    const isAsync = descriptor?.value?.constructor?.name === "AsyncFunction";

    const spy = jest.spyOn(prototype, method as string);
    if (isAsync && !(returnValue instanceof Promise)) {
      // If method is async but return value isn't a Promise, wrap it
      spy.mockResolvedValue(returnValue);
    } else {
      // If method is sync or return value is already a Promise, use as is
      spy.mockReturnValue(returnValue);
    }

    if (!this.classMocks.has(Class)) {
      this.classMocks.set(Class, []);
    }
    this.classMocks.get(Class)?.push(spy);

    return spy;
  }

  mockPrototypeWith<T, F extends (...args: any[]) => any>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    implementation: F,
  ): jest.SpyInstance<ReturnType<F>> {
    const prototype = Class.prototype;
    const spy = jest
      .spyOn(prototype, method as string)
      .mockImplementation(implementation);

    if (!this.classMocks.has(Class)) {
      this.classMocks.set(Class, []);
    }
    this.classMocks.get(Class)?.push(spy);

    return spy;
  }

  /**
   * Mocks a module function with a specific implementation.
   * @param module The module object containing the function.
   * @param method The function name to spy on.
   * @param implementation The implementation to use when the function is called.
   * @returns The jest spy instance.
   */
  mockModuleImplementation<T, F extends (...args: any[]) => any>(
    module: T,
    method: keyof T,
    implementation: F,
  ): jest.SpyInstance<ReturnType<F>> {
    const spy = jest
      //@ts-ignore
      .spyOn(module, method as string)
      //@ts-ignore
      .mockImplementation(implementation);

    if (!this.moduleMocks.has(module)) {
      this.moduleMocks.set(module, []);
    }
    this.moduleMocks.get(module)?.push(spy);

    return spy;
  }

  /**
   * Mocks a module function to return a specific value.
   * @param module The module object containing the function.
   * @param method The function name to spy on.
   * @param returnValue The value to return when the function is called.
   * @returns The jest spy instance.
   */
  mockModule<T, Return>(
    module: T,
    method: keyof T,
    returnValue: Return,
  ): jest.SpyInstance<Return> {
    const descriptor = Object.getOwnPropertyDescriptor(module, method);
    const isAsync = descriptor?.value?.constructor?.name === "AsyncFunction";

    const spy = jest.spyOn(
      //@ts-ignore
      module,
      method as string,
    ) as jest.SpyInstance<Return>;

    if (isAsync && !(returnValue instanceof Promise)) {
      // If method is async but return value isn't a Promise, wrap it
      //@ts-ignore
      spy.mockResolvedValue(returnValue);
    } else {
      // If method is sync or return value is already a Promise, use as is
      spy.mockReturnValue(returnValue);
    }

    if (!this.moduleMocks.has(module)) {
      this.moduleMocks.set(module, []);
    }

    this.moduleMocks.get(module)?.push(spy);

    return spy;
  }

  spyModule<T>(module: T, method: keyof T): jest.SpyInstance<any> {
    //@ts-ignore
    const spy = jest.spyOn(module, method as string);

    if (!this.moduleMocks.has(module)) {
      this.moduleMocks.set(module, []);
    }
    this.moduleMocks.get(module)?.push(spy);

    return spy;
  }

  clearAllMocks(): void {
    this.classMocks.forEach((spies) => {
      spies.forEach((spy) => {
        spy.mockRestore();
        spy.mockClear();
      });
    });
    this.classMocks.clear();

    this.moduleMocks.forEach((spies) => {
      spies.forEach((spy) => {
        spy.mockRestore();
        spy.mockClear();
      });
    });
  }
}
