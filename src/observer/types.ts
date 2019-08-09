// TODO: eslint seems to be broken for the following rule. Make it error again once this starts working.
/* eslint @typescript-eslint/interface-name-prefix: "warn" */
/**
 * Basic signature of an [[Observable]].
 *
 * @typeparam T - Any valid javascript type.
 */
export interface IObservable<T> {
  /**
   * Current value of the observable.
   */
  value: T;

  /**
   * Method used to update the [[value]] property.
   *
   * @param value - New value of the observable.
   */
  update(value: T): void;

  /**
   * Add a new [[IObservable]] to be observed.
   *
   * @param observable - [[IObservable]] to be observed.
   */
  observe(observable: IObservable<any>): void;

  /**
   * Stop observing an [[IObservable]].
   *
   * @param observable - [[IObservable]] to stop observing.
   */
  unobserve(observable: IObservable<any>): void;

  /**
   * Add a [[WatcherFunction]] to be called when [[value]] changes.
   *
   * @param watcher - [[WatcherFunction]] to be called on [[value]] change.
   */
  watch(watcherFunction: WatcherFunction<T>): void;

  /**
   * Remove a [[WatcherFunction]] from the watchers list.
   *
   * @param watcher - [[WatcherFunction]] to be removed.
   */
  unwatch(watcherFunction: WatcherFunction<T>): void;
}

/**
 * Interface for getting the value of an attached observable on an object.
 *
 * @typeparam T - Any valid javascript type.
 */
export interface IObservableReference<T> {
  /**
   * IObservable instance.
   */
  // If you change this name make sure to reflect the change in the 'ATTACHED_OBSERVABLE_KEY' field.
  readonly __observable__: IObservable<T>;
}
/**
 * Key from the [[IObservableReference]] interface.
 */
export const ATTACHED_OBSERVABLE_KEY = '__observable__';

/**
 * Function signature for a [[ComputedObservable]].
 *
 * @typeparam T - Any valid javascript type.
 */
export type ComputedFunction<T> = () => T;

/**
 * [[Observable]] data change event callback signature.
 *
 * @typeparam T - Any valid javascript type.
 */
export type WatcherFunction<T> = (value: T | undefined, oldValue: T | undefined) => void;

/**
 * Gets the return type of a function.
 */
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : T;

/**
 * Transform ComputedFunctions in observer data to computed properties.
 *
 * ```typescript
 * const data = {
 *    price: 50,
 *    qty: 5,
 *    total() {
 *      return this.price * this.qty;
 *    }
 * };
 *
 * // The type of data above
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
 *   total: string
 * };
 *
 * ```
 */
// tslint:disable:ban-types
export type ObservedData<T> = {
  [P in keyof T]: T[P] extends Function ? ReturnType<T[P]> : ObservedData<T[P]>;
};
