import consoleReference from 'console';
import Observable from './observable';
import ComputedObservable from './computed-observable';

global.console = consoleReference;
let errorOutput = jest.fn();

describe('Observable', () => {
  beforeEach(() => {
    errorOutput = jest.fn();
    consoleReference.error = errorOutput;
  });

  function createMockObserver() {
    return {
      evaluate: jest.fn(),
      update: jest.fn(),
    } as any;
  }

  describe('value', () => {
    it('gets set via the constructor', () => {
      const observable = new Observable('test');

      expect(observable.value).toBe('test');
    });
  });

  describe('observe', () => {
    it('adds a computed observable', () => {
      const observable = new Observable(15);

      const mockObserver = createMockObserver();

      observable.observe(mockObserver);

      // @ts-ignore
      expect(observable._observers).toContain(mockObserver);
    });

    it('does not add duplicate observables', () => {
      const observable = new Observable(true);

      const mockObserver = createMockObserver();

      observable.observe(mockObserver);
      observable.observe(mockObserver);

      // @ts-ignore
      observable.update(false);

      expect(mockObserver.update).toBeCalledTimes(1);
    });
  });

  describe('unobserve', () => {
    it('removes a observer', () => {
      const observable = new Observable(false);

      const observer1 = createMockObserver();
      const observer2 = createMockObserver();

      observable.observe(observer1);
      observable.observe(observer2);

      // @ts-ignore
      observable.update(true);

      expect(observer1.update).toBeCalledTimes(1);
      expect(observer2.update).toBeCalledTimes(1);

      observer1.update.mockClear();
      observer2.update.mockClear();

      observable.unobserve(observer1);

      // @ts-ignore
      observable.update(false);

      expect(observer1.update).toBeCalledTimes(0);
      expect(observer2.update).toBeCalledTimes(1);
    });

    it('does not cause an issue when trying to remove an observer that does not exist', () => {
      const observable = new Observable('value');

      const observer1 = createMockObserver();
      const observer2 = createMockObserver();

      observable.observe(observer1);
      observable.observe(observer2);

      // @ts-ignore
      observable.update('new value');

      expect(observer1.update).toBeCalledTimes(1);
      expect(observer2.update).toBeCalledTimes(1);

      observer1.update.mockClear();
      observer2.update.mockClear();

      observable.unobserve(observer1);
      observable.unobserve(observer1);

      // @ts-ignore
      observable.update('another new value');

      expect(observer1.update).toBeCalledTimes(0);
      expect(observer2.update).toBeCalledTimes(1);
    });
  });

  describe('watch', () => {
    it('adds a watcher to the watcher list', () => {
      const observable = new Observable(55);
      const spy = jest.fn();

      observable.watch(spy);

      // @ts-ignore
      expect(observable._watchers).toContain(spy);
    });

    it('does not add duplicate watchers', () => {
      const observable = new Observable(true);
      const spy = jest.fn();

      observable.watch(spy);
      observable.watch(spy);

      // @ts-ignore
      expect(observable._watchers).toHaveLength(1);
    });
  });

  describe('unwatch', () => {
    it('removes a watcher', () => {
      const observable = new Observable('test');
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      observable.watch(spy1);
      observable.watch(spy2);

      // @ts-ignore
      expect(observable._watchers).toContain(spy1);
      // @ts-ignore
      expect(observable._watchers).toContain(spy2);
      // @ts-ignore
      expect(observable._watchers).toHaveLength(2);

      observable.unwatch(spy1);

      // @ts-ignore
      expect(observable._watchers).not.toContain(spy1);
      // @ts-ignore
      expect(observable._watchers).toContain(spy2);
      // @ts-ignore
      expect(observable._watchers).toHaveLength(1);
    });

    it('does not cause an issue when trying to remove a watcher that does not exist', () => {
      const observable = new Observable('test');
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      observable.watch(spy1);
      observable.watch(spy2);

      // @ts-ignore
      expect(observable._watchers).toContain(spy1);
      // @ts-ignore
      expect(observable._watchers).toContain(spy2);
      // @ts-ignore
      expect(observable._watchers).toHaveLength(2);

      observable.unwatch(spy1);
      expect(() => observable.unwatch(spy1)).not.toThrow();
    });
  });

  describe('update', () => {
    it('can be used to update the observable value', () => {
      const observable = new Observable([1, 2, 3]);

      expect(observable.value).toEqual([1, 2, 3]);

      observable.update([5, 6, 7]);

      expect(observable.value).toEqual([5, 6, 7]);
    });

    it('by default notifies observers and watchers of changes', () => {
      const observable = new Observable(99);
      const mockObserver = createMockObserver();
      const mockWatcher = jest.fn();

      observable.observe(mockObserver);
      observable.watch(mockWatcher);

      observable.update(300);

      expect(mockObserver.update).toBeCalledTimes(1);
      expect(mockWatcher).toBeCalledTimes(1);
    });

    test('watcher errors are safely captured', () => {
      const observable = new Observable('test');
      const watcher = jest.fn(() => {
        throw new Error('test');
      });

      observable.watch(watcher);

      observable.update('new string');

      expect(watcher).toBeCalledTimes(1);
      expect(errorOutput).toBeCalledTimes(1);
    });

    test('observer errors are safely captured', () => {
      const observable = new Observable('test');
      const errorComputedFunction = jest.fn(() => {
        throw new Error('test');
      });
      new ComputedObservable(errorComputedFunction);

      observable.update('new string');

      expect(errorComputedFunction).toBeCalledTimes(1);
      expect(errorOutput).toBeCalledTimes(1);
    });
  });
});
