/**
 * Module with functions that emulate [vue's](https://vuejs.org/) reactivity mechanism.
 */

/** @ignore */
import { isObject, isPlainObject, prototypeAugment, navigateToPropertyPath } from '../util';
import { arrayMethods } from './array';
import ComputedObservable from './computed-observable';
import Observable from './observable';
import {
  ATTACHED_OBSERVABLE_KEY,
  IObservable,
  ObservedData,
  WatcherFunction,
  IComputedObservable,
} from './types';

/**
 * The [[IObservable]] currently being created and evaluated.
 *
 * This property is globally unique because only one [[IObservable]] can be evaluated at a time.
 */
let currentEvaluatingObservable: IComputedObservable<unknown> | undefined;

/**
 * Takes a data object and recursively makes all its properties reactive.
 *
 * ## Computed Properties
 *
 * Function definitions within the data object are treated as computed property definitions.
 *
 * ```typescript
 * const observed = observe({
 *  price: 55,
 *  quantity: 10,
 *  total() {
 *    return this.price * this.quantity;
 *  }
 * });
 *
 * console.log(observed); // output: { price: 55, quantity: 10, total: 550 }
 * ```
 *
 * @param data - Object to process.
 *
 * @typeparam T - Plain javascript object.
 */
export function observe<T extends object>(data: T): ObservedData<T> {
  if (isPlainObject(data)) {
    observeObject(data as T);
  } else {
    throw new Error('Parameter provided is not a plain javascript object.');
  }

  return data as ObservedData<T>;
}

/**
 * Iterate over a data object and make all its properties reactive.
 *
 * @param data - Data object.
 * @param observable - Observable for the data object
 *
 * @typeparam T - Any object type: array, object, class etc.
 */
export function observeObject<T extends object>(data: T, observable?: IObservable<T>): void {
  if (isObject(data)) {
    // make properties reactive
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      const value = data[keys[i] as keyof typeof data];
      let valueObservable: IObservable<typeof value> | IComputedObservable<typeof value>;

      if (typeof value === 'function') {
        valueObservable = new ComputedObservable(value.bind(data));

        currentEvaluatingObservable = valueObservable;
        valueObservable.update(valueObservable.evaluate());
        currentEvaluatingObservable = undefined;
      } else {
        valueObservable = new Observable(value);

        observeObject((value as unknown) as T, (valueObservable as unknown) as IObservable<T>);
      }

      defineReactiveProperty(data, keys[i], valueObservable);
    }

    /**
     * If data is an array attach helpers else seal the data object
     * to avoid property additions/deletions
     */
    if (Array.isArray(data)) {
      if (ATTACHED_OBSERVABLE_KEY in data === false) {
        Object.defineProperty(data, ATTACHED_OBSERVABLE_KEY, { value: observable });
        prototypeAugment(data, arrayMethods);
      }
    } else {
      Object.seal(data);
    }
  }
}

/**
 * Creates a reactive property on a specified object.
 *
 * For a property to be considered reactive it needs to be proxied with a getter/setter and also have an associated [[Observable]] instance.
 *
 * ### Reactive properties
 * ```typescript
 * const obj = {};
 * defineReactiveProperty(obj, 'number', new Observable(99));
 *
 * // Note that even though the value is proxied you can still access it as you normally access properties.
 * console.log(obj.number) // output: 99
 * obj.number = 105;
 * console.log(obj.number) // output: 105
 * ```
 *
 * @param obj - Object on which to create the reactive property.
 * @param key - Key for the new property.
 * @param observable - [[Observable]] instance that stores the value of the reactive property.
 *
 * @typeparam T - Any valid javascript value.
 */
export function defineReactiveProperty<T>(
  obj: object,
  key: string | number,
  observable: IObservable<T>,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  const getter = descriptor && descriptor.get ? descriptor.get.bind(obj) : undefined;
  const setter = descriptor && descriptor.set ? descriptor.set.bind(obj) : undefined;

  Object.defineProperty(obj, key, {
    get: function reactiveGetter(): Observable<T> | T {
      if (arguments[0] === true) {
        return observable as Observable<T>;
      } else {
        currentEvaluatingObservable && observable.observe(currentEvaluatingObservable);

        return getter ? getter.call(obj) : observable.value;
      }
    },
    // prettier-ignore
    set: observable instanceof ComputedObservable ? 
      undefined : 
      function reactiveSetter(value: T): void {
        setter && setter(value);
        value = getter ? getter() : value;
        if (observable.value !== value) {
          observeObject((value as unknown) as object, (observable as unknown) as IObservable<object>);
          observable.update(value);
        }
      },
    enumerable: true,
  });
}

/**
 * Extracts the [[Observable]] instance from a property on an object.
 *
 * This function will only work if the [[defineReactiveProperty]] method was used to define that property.
 *
 * @param object - Object where you have a reactive property.
 * @param key - Key of the property that has an observable instance.
 */
export function extractObservableFromProperty(
  object: object,
  key: string | number,
): IObservable<unknown> | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && descriptor.get ? (descriptor.get as Function)(true) : undefined;
}

/**
 * Finds the observable attached to a property within observed data and adds or removes a watcher from its watcher list.
 *
 * @param observedData - Object containing observed data created by [[observe]].
 * @param path - Path to the property in an object.
 * @param watcher - [[WatcherFunction]].
 * @param operation - Specifies what to do with the [[WatcherFunction]]
 */
function modifyPropertyWatcherList<T extends object, U>(
  observedData: T,
  path: string,
  watcher: WatcherFunction<U>,
  operation: 'add' | 'remove',
): void {
  navigateToPropertyPath(observedData, path, (obj, property): void => {
    const observable = extractObservableFromProperty(obj, property) as IObservable<U>;

    if (observable) {
      if (operation === 'add') {
        observable.watch(watcher);
      } else if (operation === 'remove') {
        observable.unwatch(watcher);
      }
    } else {
      throw new Error('Property is not observable.');
    }
  });
}

/**
 * Adds a watcher function to a property that gets called when the property changes.
 *
 * ```typescript
 * const observed = observe({
 *  price: 43,
 *  qty: 10,
 *  total() {
 *    return this.qty * this.price;
 *  }
 * });
 *
 * addPropertyWatcher(observed, 'price', (value, oldValue) => {
 *  console.log(value, oldValue);
 * });
 *
 * // watcher is called on data change
 * observed.price = 50; // output: 50 43
 * ```
 *
 * @param data - Object observed with [[observe]].
 * @param path - Path to the property on the data object.
 * @param watcher - Function to add to the properties' watchers.
 */
export function addPropertyWatcher<T>(
  data: object,
  path: string,
  watcher: WatcherFunction<T>,
): WatcherFunction<T> {
  modifyPropertyWatcherList(data, path, watcher, 'add');

  return watcher;
}

/**
 * Removes a watcher function from a property.
 *
 * ```typescript
 * const observed = observe({
 *  price: 43,
 *  qty: 10,
 *  total() {
 *    return this.qty * this.price;
 *  }
 * });
 *
 * const watcher = (value, oldValue) => {
 *  console.log(value, oldValue);
 * }
 *
 * addPropertyWatcher(observed, 'price', watcher);
 *
 * // watcher is called on data change
 * observed.price = 50; // output: 50 43
 *
 * removePropertyWatcher(observed, 'price', watcher);
 *
 * // no output since watcher was removed
 * observed.price = 90;
 * ```
 * @param data - Object observed with [[observe]].
 * @param path - Path to the property on the data object.
 * @param watcher - Function to remove from the properties' watchers.
 */
export function removePropertyWatcher<T>(
  data: object,
  path: string,
  watcher: WatcherFunction<T>,
): void {
  modifyPropertyWatcherList(data, path, watcher, 'remove');
}
