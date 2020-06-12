/**
 * Helper functionality for array observables.
 */
/** @ignore */
import { defineReactiveProperty, observeObject, ATTACHED_OBSERVABLE_KEY } from './observer';
import {
  reactivityState,
  ReactivityState,
  addReactivityQueueItem,
  REACTIVITY_DISABLED_EXCEPTION,
} from './reactivity-state';
import Observable from './observable';
import { Obj } from '../types';

/**
 * A copy of the array prototype.
 *
 * This copy's [mutator methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#Mutator_methods)
 * will get patched to enable notification of changes to an array.
 */
export const arrayMethods: typeof Array.prototype = Object.create(Array.prototype);

['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach((method): void => {
  // Cache the original method
  const original: (...args: any[]) => any = Array.prototype[method as keyof typeof Array.prototype];

  // Make the current iterator method a mutator function
  Object.defineProperty(arrayMethods, method, {
    value: function mutator<T extends T[], U>(this: T): U | undefined {
      if (reactivityState === ReactivityState.Enabled) {
        const result = original.apply(this, (arguments as unknown) as any[]) as U;
        const observable = (this as any)[ATTACHED_OBSERVABLE_KEY];

        switch (method) {
          // Purpose fall through since both methods use the same logic
          case 'push':
          case 'unshift':
            observeArrayItems(this, this.length - arguments.length, this.length);
            break;
          case 'splice':
            // eslint-disable-next-line no-case-declarations
            let insertedAmount = arguments.length - arguments[1];
            insertedAmount = insertedAmount < 0 ? 0 : insertedAmount;
            observeArrayItems(this, this.length - insertedAmount, this.length);
            break;
        }

        observable.update(this);

        return result;
      } else if (reactivityState === ReactivityState.Disabled) {
        throw new Error(REACTIVITY_DISABLED_EXCEPTION);
      } else {
        addReactivityQueueItem({
          context: this as Obj,
          func: mutator,
          args: Array.from(arguments),
        });
      }
      return undefined;
    },
  });
});

/**
 * Iterate over an array from a start index to a stop index and make those items observable.
 *
 * @param array - Array with items to be made reactive.
 * @param start - Index to start from.
 * @param stop - Item to stop at (exclusive). For example "stop = 9" will stop at index 8.
 *
 * @typeparam T - Any array type
 */
function observeArrayItems<T extends T[]>(array: T, start: number, stop: number): void {
  for (let i = start; i < stop; i++) {
    observeObject(array[i] as Obj);
    const observable = new Observable(array[i]);
    defineReactiveProperty(array as Obj, i, observable);
  }
}
