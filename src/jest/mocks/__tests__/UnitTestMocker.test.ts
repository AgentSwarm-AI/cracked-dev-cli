/* eslint-disable @typescript-eslint/ban-ts-comment */
import { UnitTestMocker } from "../UnitTestMocker";

describe("UnitTestMocker", () => {
  let mocker: UnitTestMocker;

  beforeEach(() => {
    mocker = new UnitTestMocker();
  });

  afterEach(() => {
    mocker.clearAllMocks();
    jest.restoreAllMocks();
  });

  class TestClass {
    someMethod(arg: string): string {
      return `original ${arg}`;
    }

    someMethodWithArgs(arg1: string, arg2: number): string {
      return `original ${arg1} ${arg2}`;
    }

    async asyncMethod(arg: string): Promise<string> {
      return Promise.resolve(`async original ${arg}`);
    }

    async asyncMethodWithArgs(arg1: string, arg2: number): Promise<string> {
      return Promise.resolve(`async original ${arg1} ${arg2}`);
    }
  }

  const testModule = {
    testFunction(arg: string): string {
      return `testModule ${arg}`;
    },
    testFunctionWithArgs(arg1: string, arg2: number): string {
      return `testModule ${arg1} ${arg2}`;
    },
    async asyncTestFunction(arg: string): Promise<string> {
      return Promise.resolve(`async testModule ${arg}`);
    },

    async asyncTestFunctionWithArgs(
      arg1: string,
      arg2: number,
    ): Promise<string> {
      return Promise.resolve(`async testModule ${arg1} ${arg2}`);
    },
  };

  describe("spyOnPrototypeMethod", () => {
    it("should spy on a prototype method", () => {
      const spy = mocker.spyPrototype<TestClass, string>(
        TestClass,
        "someMethod",
      );
      const instance = new TestClass();
      instance.someMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(instance.someMethod("test")).toBe("original test");
    });

    it("should spy on a prototype method with arguments", () => {
      const spy = mocker.spyPrototype<TestClass, string>(
        TestClass,
        "someMethodWithArgs",
      );
      const instance = new TestClass();
      instance.someMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(instance.someMethodWithArgs("test", 123)).toBe(
        "original test 123",
      );
    });

    it("should spy on an async prototype method", async () => {
      const spy = mocker.spyPrototype<TestClass, Promise<string>>(
        TestClass,
        "asyncMethod",
      );
      const instance = new TestClass();
      await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(await instance.asyncMethod("test")).toBe("async original test");
    });
    it("should spy on an async prototype method with arguments", async () => {
      const spy = mocker.spyPrototype<TestClass, Promise<string>>(
        TestClass,
        "asyncMethodWithArgs",
      );
      const instance = new TestClass();
      await instance.asyncMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(await instance.asyncMethodWithArgs("test", 123)).toBe(
        "async original test 123",
      );
    });
  });

  describe("spyOnPrototypeAndReturn", () => {
    it("should spy on a prototype method and mock its return value (sync)", () => {
      const spy = mocker.mockPrototype<TestClass, string>(
        TestClass,
        "someMethod",
        "mocked return",
      );
      const instance = new TestClass();
      const result = instance.someMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked return");
    });

    it("should spy on a prototype method with arguments and mock its return value (sync)", () => {
      const spy = mocker.mockPrototype<TestClass, string>(
        TestClass,
        "someMethodWithArgs",
        "mocked return",
      );
      const instance = new TestClass();
      const result = instance.someMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked return");
    });

    it("should spy on an async prototype method and mock its resolved value", async () => {
      const spy = mocker.mockPrototype<TestClass, Promise<string>>(
        TestClass,
        "asyncMethod",
        Promise.resolve("mocked async return"),
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked async return");
    });

    it("should spy on an async prototype method with arguments and mock its resolved value", async () => {
      const spy = mocker.mockPrototype<TestClass, Promise<string>>(
        TestClass,
        "asyncMethodWithArgs",
        Promise.resolve("mocked async return"),
      );
      const instance = new TestClass();
      const result = await instance.asyncMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked async return");
    });

    it("should spy on an async prototype method and mock its resolved value (direct promise)", async () => {
      const spy = mocker.mockPrototype<TestClass, string>(
        TestClass,
        "asyncMethod",
        "mocked async return",
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked async return");
    });

    it("should handle the case where the method is async but the return value is not a promise", async () => {
      const spy = mocker.mockPrototype<TestClass, string>(
        TestClass,
        "asyncMethod",
        "mocked return",
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked return");
    });

    // New tests for auto-wrapping functionality
    it("should auto-wrap non-promise return value for async method", async () => {
      const spy = mocker.mockPrototype<TestClass, number>(
        TestClass,
        "asyncMethod",
        42,
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(42);
    });

    it("should auto-wrap null return value for async method", async () => {
      const spy = mocker.mockPrototype<TestClass, null>(
        TestClass,
        "asyncMethod",
        null,
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(null);
    });

    it("should auto-wrap undefined return value for async method", async () => {
      const spy = mocker.mockPrototype<TestClass, undefined>(
        TestClass,
        "asyncMethod",
        undefined,
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(undefined);
    });

    it("should auto-wrap object return value for async method", async () => {
      const returnValue = { foo: "bar" };
      const spy = mocker.mockPrototype<TestClass, object>(
        TestClass,
        "asyncMethod",
        returnValue,
      );
      const instance = new TestClass();
      const result = await instance.asyncMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(returnValue);
    });
  });

  describe("spyOnPrototypeWithImplementation", () => {
    it("should spy on a prototype method and mock its implementation", () => {
      const spy = mocker.mockPrototypeWith<TestClass, (arg: string) => string>(
        TestClass,
        "someMethod",
        (arg: string) => `mocked implementation ${arg}`,
      );
      const instance = new TestClass();
      const result = instance.someMethod("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked implementation test");
    });

    it("should spy on a prototype method with arguments and mock its implementation", () => {
      const spy = mocker.mockPrototypeWith<
        TestClass,
        (arg1: string, arg2: number) => string
      >(
        TestClass,
        "someMethodWithArgs",
        (arg1: string, arg2: number) => `mocked implementation ${arg1} ${arg2}`,
      );
      const instance = new TestClass();
      const result = instance.someMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked implementation test 123");
    });

    it("should spy on an async prototype method with arguments and mock its implementation", async () => {
      const spy = mocker.mockPrototypeWith<
        TestClass,
        (arg1: string, arg2: number) => Promise<string>
      >(TestClass, "asyncMethodWithArgs", (arg1: string, arg2: number) =>
        Promise.resolve(`mocked implementation ${arg1} ${arg2}`),
      );
      const instance = new TestClass();
      const result = await instance.asyncMethodWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked implementation test 123");
    });

    it("should spy on a prototype method and mock its implementation with different types", () => {
      const spy = mocker.mockPrototypeWith<TestClass, (arg: number) => string>(
        TestClass,
        "someMethod",
        (arg: number) => `mocked implementation ${arg}`,
      );
      const instance = new TestClass();
      // @ts-ignore
      const result = instance.someMethod(12);

      expect(spy).toHaveBeenCalled();
      // @ts-ignore
      expect(spy).toHaveBeenCalledWith(12);
      expect(result).toBe("mocked implementation 12");
    });
  });

  describe("spyOnModuleFunction", () => {
    it("should spy on a module function and mock its return value", () => {
      const spy = mocker.mockModule<typeof testModule, string>(
        testModule,
        "testFunction",
        "mocked module return",
      );
      const result = testModule.testFunction("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked module return");
    });

    it("should spy on a module function with arguments and mock its return value", () => {
      const spy = mocker.mockModule<typeof testModule, string>(
        testModule,
        "testFunctionWithArgs",
        "mocked module return",
      );
      const result = testModule.testFunctionWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked module return");
    });

    it("should spy on an async module function and mock its resolved value", async () => {
      const spy = mocker.mockModule<typeof testModule, Promise<string>>(
        testModule,
        "asyncTestFunction",
        Promise.resolve("mocked async module return"),
      );
      const result = await testModule.asyncTestFunction("test");
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked async module return");
    });

    it("should spy on an async module function with arguments and mock its resolved value", async () => {
      const spy = mocker.mockModule<typeof testModule, Promise<string>>(
        testModule,
        "asyncTestFunctionWithArgs",
        Promise.resolve("mocked async module return"),
      );
      const result = await testModule.asyncTestFunctionWithArgs("test", 123);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked async module return");
    });

    // New tests for auto-wrapping functionality in modules
    it("should auto-wrap non-promise return value for async module function", async () => {
      const spy = mocker.mockModule<typeof testModule, number>(
        testModule,
        "asyncTestFunction",
        42,
      );
      const result = await testModule.asyncTestFunction("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(42);
    });

    it("should auto-wrap object return value for async module function", async () => {
      const returnValue = { foo: "bar" };
      const spy = mocker.mockModule<typeof testModule, object>(
        testModule,
        "asyncTestFunction",
        returnValue,
      );
      const result = await testModule.asyncTestFunction("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe(returnValue);
    });
  });

  describe("spyOnModuleFunctionCall", () => {
    it("should spy on a module function with arguments and not mock its return value", () => {
      const spy = mocker.spyModule(testModule, "testFunctionWithArgs");
      const result = testModule.testFunctionWithArgs("test", 123);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("testModule test 123");
    });

    it("should spy on a module function and not mock its return value", () => {
      const spy = mocker.spyModule(testModule, "testFunction");
      const result = testModule.testFunction("test");
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("testModule test"); // Should not be mocked
    });

    it("should spy on an async module function with arguments and not mock its return value", async () => {
      const spy = mocker.spyModule(testModule, "asyncTestFunctionWithArgs");
      const result = await testModule.asyncTestFunctionWithArgs("test", 123);
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("async testModule test 123");
    });

    it("should spy on an async module function and not mock its return value", async () => {
      const spy = mocker.spyModule(testModule, "asyncTestFunction");
      const result = await testModule.asyncTestFunction("test");
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("async testModule test");
    });
  });

  describe("spyOnModuleFunctionWithImplementation", () => {
    it("should spy on a module function and mock its implementation", () => {
      const spy = mocker.mockModuleImplementation<
        typeof testModule,
        (arg: string) => string
      >(
        testModule,
        "testFunction",
        (arg: string) => `mocked implementation ${arg}`,
      );
      const result = testModule.testFunction("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked implementation test");
    });

    it("should spy on a module function with arguments and mock its implementation", () => {
      const spy = mocker.mockModuleImplementation<
        typeof testModule,
        (arg1: string, arg2: number) => string
      >(
        testModule,
        "testFunctionWithArgs",
        (arg1: string, arg2: number) => `mocked implementation ${arg1} ${arg2}`,
      );
      const result = testModule.testFunctionWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked implementation test 123");
    });

    it("should spy on an async module function and mock its implementation", async () => {
      const spy = mocker.mockModuleImplementation<
        typeof testModule,
        (arg: string) => Promise<string>
      >(testModule, "asyncTestFunction", (arg: string) =>
        Promise.resolve(`mocked implementation ${arg}`),
      );
      const result = await testModule.asyncTestFunction("test");

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test");
      expect(result).toBe("mocked implementation test");
    });

    it("should spy on an async module function with arguments and mock its implementation", async () => {
      const spy = mocker.mockModuleImplementation<
        typeof testModule,
        (arg1: string, arg2: number) => Promise<string>
      >(testModule, "asyncTestFunctionWithArgs", (arg1: string, arg2: number) =>
        Promise.resolve(`mocked implementation ${arg1} ${arg2}`),
      );
      const result = await testModule.asyncTestFunctionWithArgs("test", 123);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith("test", 123);
      expect(result).toBe("mocked implementation test 123");
    });
  });

  describe("clearAllMocks", () => {
    it("should clear all mocks set by spyOnPrototypeAndReturn", async () => {
      const spy1 = mocker.mockPrototype(
        TestClass,
        "someMethod",
        "mocked return",
      );
      const spy2 = mocker.mockPrototype(
        TestClass,
        "asyncMethod",
        Promise.resolve("mocked async return"),
      );
      const spy3 = mocker.mockModule(
        testModule,
        "testFunction",
        "mocked module return",
      );
      const spy4 = mocker.spyModule(testModule, "asyncTestFunction");
      const spy5 = mocker.mockModuleImplementation(
        testModule,
        "testFunction",
        (arg: string) => `mocked impl ${arg}`,
      );

      const instance = new TestClass();
      instance.someMethod("test");
      await instance.asyncMethod("test");
      testModule.testFunction("test");
      await testModule.asyncTestFunction("test");

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
      expect(spy4).toHaveBeenCalled();
      expect(spy5).toHaveBeenCalled();

      mocker.clearAllMocks();

      const result1 = instance.someMethod("test2");
      const result2 = await instance.asyncMethod("test2");
      const result3 = testModule.testFunction("test2");
      const result4 = await testModule.asyncTestFunction("test2");

      expect(result1).toBe("original test2");
      expect(result2).toBe("async original test2");
      expect(result3).toBe("testModule test2");
      expect(result4).toBe("async testModule test2");
    });

    it("should clear all mocks set by spyOnPrototypeWithImplementation", async () => {
      const spy1 = mocker.mockPrototypeWith(
        TestClass,
        "someMethod",
        (arg: string) => `mocked impl ${arg}`,
      );

      const spy2 = mocker.mockPrototypeWith(
        TestClass,
        "asyncMethod",
        (arg: string) => Promise.resolve(`mocked impl ${arg}`),
      );

      const instance = new TestClass();
      instance.someMethod("test");
      await instance.asyncMethod("test");

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();

      mocker.clearAllMocks();

      const result1 = instance.someMethod("test2");
      const result2 = await instance.asyncMethod("test2");

      expect(result1).toBe("original test2");
      expect(result2).toBe("async original test2");
    });
  });
});
