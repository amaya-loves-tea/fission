import consoleReference from 'console';
import Observable from '../../src/observer/observable';

global.console = consoleReference;
const errorOutput = jest.fn();
consoleReference.error = errorOutput;

describe('Observable', () => {
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

    it('cannot be set directly', () => {
      const observable = new Observable(43);

      try {
        // @ts-ignore
        observable.value = 99;
        fail('able to set observable value');
      } catch (ex) {
        expect(ex).toBeDefined();
      }

      expect(observable.value).toBe(43);
    });

    it('is a getter', () => {
      const observable = new Observable([1, 2, 3]);

      const propertyDescriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(observable),
        'value',
      );

      expect(propertyDescriptor).toBeDefined();
      expect(propertyDescriptor!.get).toBeDefined();
    });
  });

  describe('observe', () => {
    it('adds a computed observable', () => {
      const observable = new Observable(15);

      const mockObserver = createMockObserver();

      observable.observe(mockObserver);

      // @ts-ignore
      observable._updateObservers();

      expect(mockObserver.update).toBeCalledTimes(1);
    });

    it('does not add duplicate observables', () => {
      const observable = new Observable(true);

      const mockObserver = createMockObserver();

      observable.observe(mockObserver);
      observable.observe(mockObserver);

      // @ts-ignore
      observable._updateObservers();

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
      observable._updateObservers();

      expect(observer1.update).toBeCalledTimes(1);
      expect(observer2.update).toBeCalledTimes(1);

      observer1.update.mockClear();
      observer2.update.mockClear();

      observable.unobserve(observer1);

      // @ts-ignore
      observable._updateObservers();

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
      observable._updateObservers();

      expect(observer1.update).toBeCalledTimes(1);
      expect(observer2.update).toBeCalledTimes(1);

      observer1.update.mockClear();
      observer2.update.mockClear();

      observable.unobserve(observer1);
      observable.unobserve(observer1);

      // @ts-ignore
      observable._updateObservers();

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

  describe('_invokeWatchers', () => {
    it('calls registered watcher functions', () => {
      const observer = new Observable('test');
      const watcher = jest.fn();

      (observer as any)._watchers.push(watcher);

      (observer as any)._invokeWatchers('new value', 'old value');

      expect(watcher).toBeCalledTimes(1);
      expect(watcher).toBeCalledWith('new value', 'old value');
    });

    it('logs an error to the console when a watcher throws an exception', () => {
      const observer = new Observable('test');
      const watcher = jest.fn(() => {
        throw new Error('test');
      });

      (observer as any)._watchers.push(watcher);

      (observer as any)._invokeWatchers('new value', 'old value');

      expect(watcher).toBeCalledTimes(1);
      expect(errorOutput).toBeCalledTimes(1);
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

      // @ts-ignore
      observable._updateObservers = jest.fn(observable._updateObservers);
      // @ts-ignore
      observable._invokeWatchers = jest.fn(observable._invokeWatchers);

      observable.update(300);

      // @ts-ignore
      expect(observable._updateObservers).toBeCalledTimes(1);
      // @ts-ignore
      expect(observable._invokeWatchers).toBeCalledTimes(1);
    });
  });
});
