type MockedMethod<T> = jest.SpyInstance<Promise<T>>;

export class UnitTestMocker {
  private mocks: Map<any, MockedMethod<any>[]> = new Map();

  spyOnPrototype<T, R>(
    Class: new (...args: any[]) => T,
    method: keyof T,
    returnValue: R,
  ): MockedMethod<R> {
    const spy = jest
      .spyOn(Class.prototype, method as string)
      .mockResolvedValue(returnValue);

    if (!this.mocks.has(Class)) {
      this.mocks.set(Class, []);
    }
    this.mocks.get(Class)?.push(spy);

    return spy;
  }

  clearAllMocks(): void {
    this.mocks.forEach((spies) => {
      spies.forEach((spy) => spy.mockClear());
    });
  }
}
