/**
 * Module with functions that emulate [vue's](https://vuejs.org/) reactivity mechanism.
 */

/** @ignore */
import { isObject, isPlainObject, prototypeAugment } from '../util';
import { arrayMethods } from './array';
import ComputedObservable from './computed-observable';
import Observable from './observable';
import {
  ATTACHED_OBSERVABLE_KEY,
  ComputedFunction,
  IObservable,
  IObservableReference,
  ObservedData,
  WatcherFunction,
} from './types';

/**
 * The [[IObservable]] currently being created and evaluated.
 *
 * This property is globally unique because only one [[IObservable]] can be evaluated at a time.
 */
let currentEvaluatingObservable: IObservable<any> | undefined;

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
    let shouldSeal = true;

    if (Array.isArray(data)) {
      shouldSeal = false;
      if (!(data as IObservableReference<T>).__observable__) {
        Object.defineProperty(data, ATTACHED_OBSERVABLE_KEY, { value: observable });
        prototypeAugment((data as unknown) as object, arrayMethods);
      }
    }

    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      let value = data[keys[i] as keyof typeof data];
      let valueObservable: IObservable<typeof value>;

      if (typeof value === 'function') {
        value = value.bind(data);
        valueObservable = new ComputedObservable((value as unknown) as ComputedFunction<
          typeof value
        >);

        currentEvaluatingObservable = valueObservable;
        const evaluatedObservableValue = (valueObservable as ComputedObservable<T>).evaluate();
        valueObservable.update((evaluatedObservableValue as unknown) as T[Extract<
          keyof T,
          string
        >]);
        currentEvaluatingObservable = undefined;
      } else {
        valueObservable = new Observable(value);

        observeObject((value as unknown) as T, (valueObservable as unknown) as IObservable<T>);
      }

      defineReactiveProperty(data, keys[i], valueObservable);
    }

    if (shouldSeal) {
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
  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  const getter = propertyDescriptor ? propertyDescriptor.get : undefined;
  const setter = propertyDescriptor ? propertyDescriptor.set : undefined;

  Object.defineProperty(obj, key, {
    get(): Observable<T> | any {
      if (arguments[0] === true) {
        return observable;
      } else {
        if (currentEvaluatingObservable) {
          observable.observe(currentEvaluatingObservable as ComputedObservable<T>);
        }
        return getter ? getter.call(obj) : observable.value;
      }
    },
    // prettier-ignore
    set: observable instanceof ComputedObservable ? (): void => { /* */ } : function (newValue: T): void {      
      if (setter) {
        setter.call(obj, newValue);
      }
      newValue = getter ? getter.call(obj): newValue;
      if (newValue !== observable.value) {
        observeObject(newValue as unknown as object, observable as unknown as IObservable<object>);
        observable.update(newValue);
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
): IObservable<any> | undefined {
  const propertyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
    object,
    key,
  );
  if (propertyDescriptor && propertyDescriptor.get) {
    return (propertyDescriptor.get as any)(true);
  }
  return undefined;
}

/**
 * Traverses a string path for an object to find the property it is pointing to.
 *
 * Once the property is found a callback function is called passing in the property's parent object and the property name.
 *
 * ```typescript
 * const data = {
 *   nested: {
 *    anotherNested: {
 *      property: 'value',
 *      number: 66
 *    }
 *   }
 * };
 *
 * navigateToPropertyPath(data, 'nested.anotherNested.property', (obj, property) => {
 *  console.log(obj, property);
 * });
 *
 * // output: {property: 'value', number: 66} property
 * ```
 *
 * @param obj - Object to traverse.
 * @param path - Path to a property on the obj.
 * @param callback - Callback to be called when the property is found.
 */
export function navigateToPropertyPath<T extends object>(
  obj: T,
  path: string,
  callback: (obj: object, key: string) => void,
): void {
  const properties = path.split('.');
  let property: string;

  for (let i = 0; i < properties.length; i++) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(properties[i])) {
      property = properties[i];
      if (i !== properties.length - 1) {
        obj = obj[property as keyof object];
      }
    } else {
      throw new Error(`Object does not contain the property with path ${path}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  callback(obj, property!);
}

/**
 * Finds the observable attached to a property within observed data and adds or removes a watcher from its watcher list.
 *
 * @param observedData - Object containing observed data created by [[observe]].
 * @param path - Path to the property in an object.
 * @param watcher - [[WatcherFunction]].
 * @param operation - Specifies what to do with the [[WatcherFunction]]
 */
function modifyPropertyWatcherList<T extends object>(
  observedData: T,
  path: string,
  watcher: WatcherFunction<any>,
  operation: 'add' | 'remove',
): void {
  navigateToPropertyPath(observedData, path, (obj, property): void => {
    const observable = extractObservableFromProperty(obj, property);

    if (observable) {
      if (operation === 'add') {
        observable.watch(watcher);
      } else if (operation === 'remove') {
        observable.unwatch(watcher);
      }
    } else {
      throw new Error('Property is not an observable property.');
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
