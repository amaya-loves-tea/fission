import { logError } from '../util';
import ComputedObservable from './computed-observable';
import { IObservable, WatcherFunction } from './types';

/**
 * Exception thrown when a [[WatcherFunction]] invocation causes an error.
 */
const WATCHER_EXCEPTION = 'Watcher failed to execute.';

/**
 * A [[Observable]] is a value that can be observed for changes.
 *
 * This observation can happen in two forms: Watchers and Observers.
 *
 * ### Watchers
 * Watchers are simple functions that get called when the observable value changes.
 *
 * They receives the new and old value of the observable as arguments.
 * ```typescript
 * const observable = new Observable(20);
 *
 * observable.watch((value, oldValue) => {
 *  console.log(value, oldValue);
 * });
 *
 * observable.update(15); // output: 15 20
 * ```
 *
 * ### Observers
 * Observers are [[ComputedObservable]]s.
 *
 * When the observable changes then the observers are updated.
 * ```typescript
 * const observable = new Observable(20);
 * const computedObservable = new ComputedObservable(() => observable.value * 2);
 * computedObservable.update(computedObservable.evaluate());
 *
 * console.log(computedObservable.value); // output: 40
 *
 * observable.observe(computedObservable);
 *
 * // Since the computed observable is now 'observed' it will get updated when the observable changes.
 * observable.update(15);
 *
 * console.log(computedObservable.value); // output: 30
 * ```
 *
 * @typeparam T - Any valid javascript value.
 */
export default class Observable<T> implements IObservable<T> {
  /** @ignore */
  private _value: T;
  /**
   * Current value of the observable.
   */
  public get value(): T {
    return this._value;
  }

  /**
   * List of [[ComputedObservable]]s that need to be updated when [[value]] changes.
   */
  protected _observers: ComputedObservable<any>[] = [];

  /**
   * List of [[WatcherFunction]]s that get run when the observable [[value]] changes.
   */
  protected _watchers: WatcherFunction<T>[] = [];

  /**
   * @param value - Initial value of the observable.
   */
  public constructor(value: T) {
    this._value = value;
  }

  /**
   * Add a new [[ComputedObservable]] to be observed.
   *
   * @param observable - [[ComputedObservable]] to be observed.
   */
  public observe(observable: ComputedObservable<any>): void {
    if (this._observers.indexOf(observable) === -1) {
      this._observers.push(observable);
    }
  }

  /**
   * Stop observing a [[ComputedObservable]].
   *
   * @param observable - [[ComputedObservable]] to stop observing.
   */
  public unobserve(observable: ComputedObservable<any>): void {
    const index = this._observers.indexOf(observable);
    if (index > -1) {
      this._observers.splice(index, 1);
    }
  }

  /**
   * Add a [[WatcherFunction]] to be called when [[value]] changes.
   *
   * @param watcher - [[WatcherFunction]] to be called on [[value]] change.
   */
  public watch(watcher: WatcherFunction<T>): void {
    if (this._watchers.indexOf(watcher) === -1) {
      this._watchers.push(watcher);
    }
  }

  /**
   * Remove a [[WatcherFunction]] from the watchers list.
   *
   * @param watcher - [[WatcherFunction]] to be removed.
   */
  public unwatch(watcher: WatcherFunction<T>): void {
    const index = this._watchers.indexOf(watcher);
    if (index > -1) {
      this._watchers.splice(index, 1);
    }
  }

  /**
   * Method used to update the [[value]] property.
   *
   * @param value - New value of the observable.
   */
  public update(value: T): void {
    const oldValue = this.value;
    this._value = value;

    this._updateObservers();

    this._invokeWatchers(this.value, oldValue);
  }

  /**
   * Iterates over observers and recalculates their values.
   */
  protected _updateObservers(): void {
    for (const observer of this._observers) {
      observer.update(observer.evaluate());
    }
  }

  /**
   * Safely invoke the watchers registered on this observable.
   *
   * @param value - New value of the observer.
   * @param oldValue - Old value of the observer.
   */
  protected _invokeWatchers(value: T | undefined, oldValue: T | undefined): void {
    for (const callback of this._watchers) {
      try {
        callback(value, oldValue);
      } catch (exception) {
        logError(WATCHER_EXCEPTION, exception);
      }
    }
  }
}
