import { logError } from '../util';
import { ComputedFunction, IComputedObservable } from './types';
import Observable from './observable';

/**
 * Exception thrown when a [[ComputedFunction]] produces an error.
 */
const COMPUTED_FUNCTION_EXCEPTION = 'Computed function failed to evaluate.';

/**
 * A [[ComputedObservable]] is an [[Observable]] that contains a [[ComputedFunction]].
 *
 * The intention of a computed function is to use it to evaluate [[Observable.value]] instead of setting it directly.
 *
 * Similarly to [[Observable]]s a [[ComputedObservable]] can also be watched and observed.
 *
 * @typeparam T - Any valid javascript type that is returned from the [[ComputedObservable._computedFunction]] function.
 */
class ComputedObservable<T> extends Observable<unknown> implements IComputedObservable<T> {
  /**
   * Function that should be used to evaluate this object's [[Observable.value]].
   */
  private _computedFunction: ComputedFunction<T>;

  /**
   * @param computedFunction - Function that should be used to evaluate this object's [[Observable.value]].
   */
  public constructor(computedFunction: ComputedFunction<T>) {
    super(undefined);
    this._computedFunction = computedFunction;
  }

  /**
   * Safely evaluate the return value of [[_computedFunction]].
   *
   * Observables updates are turned off to ensure computed observables have no side effects.
   */
  public evaluate(): T | undefined {
    try {
      return this._computedFunction();
    } catch (exception) {
      logError(COMPUTED_FUNCTION_EXCEPTION, exception);
    }
    return undefined;
  }
}

export default ComputedObservable;
