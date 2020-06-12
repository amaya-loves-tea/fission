/**
 * Contains functionality to add watchers to observed data.
 */

/** @ignore */
import Observable, { WatcherFunction } from './observable';
import { extractObservableFromProperty } from './observer';
import { navigateToPropertyPath } from '../util';
import { Obj } from '../types';

/**
 * Finds the observable attached to a property within observed data and adds or removes a watcher from its watcher list.
 *
 * @param observedData - Object containing observed data created by [[observe]].
 * @param path - Path to the property in an object.
 * @param watcher - [[WatcherFunction]].
 * @param operation - Specifies what to do with the [[WatcherFunction]]
 *
 * @typeparam T - Object on which to register a property watcher.
 * @typeparam U - Return type of the property watcher.
 */
function modifyPropertyWatcherList<T extends Obj, U>(
  observedData: T,
  path: string,
  watcher: WatcherFunction<U>,
  operation: 'add' | 'remove',
): void {
  navigateToPropertyPath(observedData, path, (obj, property): void => {
    const observable = extractObservableFromProperty(obj, property) as Observable<U>;

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
 *
 * @typeparam T - Return type of the watcher function.
 */
export function addPropertyWatcher<T>(
  data: Obj,
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
 * const watcher = addPropertyWatcher(observed, 'price', (value, oldValue) => {
 *  console.log(value, oldValue);
 * });
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
 *
 * @typeparam T - Return type of the watcher function.
 */
export function removePropertyWatcher<T>(
  data: Obj,
  path: string,
  watcher: WatcherFunction<T>,
): void {
  modifyPropertyWatcherList(data, path, watcher, 'remove');
}
