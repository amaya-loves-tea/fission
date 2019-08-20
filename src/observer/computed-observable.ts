import { logError } from '../util';
import Observable from './observable';
import { setReactivityState, ReactivityState, reactivityState } from './reactivity-state';

/**
 * The [[ComputedObservable]] currently being created and evaluated.
 *
 * This property is globally unique because only one [[ComputedObservable]] can be evaluated at a time.
 */
export let currentEvaluatingObservable: ComputedObservable<unknown> | undefined;

/**
 * Computed function definition for a [[ComputedObservable]].
 *
 * @typeparam T - Any valid javascript type.
 */
export type ComputedFunction<T> = () => T;

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
export default class ComputedObservable<T> extends Observable<unknown> {
  /**
   * Function that should be used to evaluate this object's [[Observable.value]].
   */
  private _computedFunction: ComputedFunction<T>;

  /**
   * @param computedFunction - [[ComputedFunction]] definition.
   */
  public constructor(computedFunction: ComputedFunction<T>) {
    super(undefined);
    this._computedFunction = computedFunction;
    currentEvaluatingObservable = this;
    this.value = this.evaluate();
    currentEvaluatingObservable = undefined;
  }

  /**
   * Safely evaluate the return value of [[_computedFunction]].
   *
   * Observable updates are turned off to ensure computed observables have no side effects.
   */
  public evaluate(): T | undefined {
    const currentReactivityState = reactivityState;
    try {
      setReactivityState(ReactivityState.Disabled);
      return this._computedFunction();
    } catch (exception) {
      logError(COMPUTED_FUNCTION_EXCEPTION, exception);
    } finally {
      setReactivityState(currentReactivityState);
    }
    return undefined;
  }
}
