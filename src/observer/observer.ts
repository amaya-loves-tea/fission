/**
 * Module with functions that emulate [vue's](https://vuejs.org/) 2.x reactivity mechanism.
 */

/** @ignore */
import { isObject, isPlainObject, prototypeAugment } from '../util';
import { arrayMethods } from './array';
import ComputedObservable, { currentEvaluatingObservable } from './computed-observable';
import Observable from './observable';
import {
  reactivityState,
  ReactivityState,
  addReactivityQueueItem,
  REACTIVITY_DISABLED_EXCEPTION,
} from './reactivity-state';
import { Obj } from '../types';

/**
 * Gets the return type of a function.
 *
 * @typeparam T - Any function definition.
 */
type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : T;

/**
 * Transform functions on objects to properties with the return type of the function.
 *
 * ```typescript
 * type dataType = {
 *  price: number,
 *  qty: number,
 *  total(): number
 * };
 *
 * // The transformed type after using ObservedData<T>
 * type dataTypeAsObservedData = {
 *   price: number,
 *   qty: number,
 *   total: number
 * };
 * ```
 *
 * @typeparam T - Plain javascript object.
 */
export type ObservedData<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any ? ReturnType<T[P]> : ObservedData<T[P]>;
};

/**
 * Key used to attach an observable instance to an object.
 */
export const ATTACHED_OBSERVABLE_KEY = '__observable__';

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
export function observe<T extends Obj>(data: T): ObservedData<T> {
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
 * @param observable - Optional observable for the data object.
 *
 * @typeparam T - Any object type: array, object, class etc.
 */
export function observeObject<T extends Obj>(data: T, observable?: Observable<T>): void {
  if (isObject(data)) {
    // make properties reactive
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      const value = data[keys[i] as keyof typeof data];
      let valueObservable: Observable<typeof value> | ComputedObservable<typeof value>;

      if (typeof value === 'function') {
        valueObservable = new ComputedObservable(value.bind(data));
      } else {
        valueObservable = new Observable(value);

        observeObject((value as unknown) as T, (valueObservable as unknown) as Observable<T>);
      }

      defineReactiveProperty(data, keys[i], valueObservable as Observable<typeof value>);
    }

    /**
     * If data is an array attach helpers else seal the data object
     * to avoid property additions/deletions
     */
    if (Array.isArray(data)) {
      if (ATTACHED_OBSERVABLE_KEY in data === false) {
        Object.defineProperty(data, ATTACHED_OBSERVABLE_KEY, { value: observable });
        prototypeAugment(data, arrayMethods as any);
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
  obj: Obj,
  key: string | number,
  observable: Observable<T>,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (!descriptor || (descriptor && descriptor.configurable)) {
    // cater for user defined getters
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
      set:
        observable instanceof ComputedObservable
          ? undefined
          : function reactiveSetter(value: T): void {
              if (reactivityState === ReactivityState.Enabled) {
                setter && setter(value);
                value = getter ? getter() : value;
                if (observable.value !== value) {
                  observeObject(
                    (value as unknown) as Obj,
                    (observable as unknown) as Observable<Obj>,
                  );
                  observable.update(value);
                }
              } else if (reactivityState === ReactivityState.Disabled) {
                throw new Error(REACTIVITY_DISABLED_EXCEPTION);
              } else {
                addReactivityQueueItem({ func: reactiveSetter, args: [value] });
              }
            },
      enumerable: true,
    });
  }
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
  object: Obj,
  key: string | number,
): Observable<unknown> | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && descriptor.get
    ? (descriptor.get as (...args: any[]) => any)(true)
    : undefined;
}
