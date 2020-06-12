import { arrayMethods } from './array';
import Observable from './observable';
import { ATTACHED_OBSERVABLE_KEY } from './observer';
import {
  REACTIVITY_DISABLED_EXCEPTION,
  setReactivityState,
  ReactivityState,
  processReactivityQueue,
} from './reactivity-state';
import { Obj } from '../types';

describe('Array observer helper functionality', () => {
  describe('arrayMethods', () => {
    const patchedMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

    it('contains patched array mutator methods', () => {
      patchedMethods.forEach((method) => {
        // @ts-ignore
        expect(typeof arrayMethods[method as keyof Obj]).toBe('function');
        // @ts-ignore
        expect((arrayMethods[method as keyof Obj] as any).name).toBe('mutator');
      });
    });

    describe('patched array mutator methods', () => {
      it('calls the attached observable update method when invoked', () => {
        const array: any = [1, 2, 3, 4, 5];
        const mockObservable = { update: jest.fn() };

        array[ATTACHED_OBSERVABLE_KEY] = mockObservable;

        patchedMethods.forEach((method) => {
          (arrayMethods as any)[method].call(array);
        });

        expect(mockObservable.update).toBeCalledTimes(patchedMethods.length);
      });

      it('still retains their original functionality', () => {
        const array: any = [1, 2, 3, 4, 5];
        const arrayCopy: any = [1, 2, 3, 4, 5];

        const mockObservable = { update: jest.fn() };

        array[ATTACHED_OBSERVABLE_KEY] = mockObservable;
        arrayCopy[ATTACHED_OBSERVABLE_KEY] = mockObservable;

        patchedMethods.forEach((method) => {
          if (method === 'sort') {
            const mutatedResult = (arrayMethods as any)[method].call(
              array,
              (x: number, y: number) => x - y,
            );
            const result = arrayCopy[method]((x: number, y: number) => x - y);

            expect(mutatedResult).toEqual(result);
            expect(array).toEqual(arrayCopy);
          } else {
            const mutatedResult = (arrayMethods as any)[method].call(array, 9, 9);
            const result = arrayCopy[method](9, 9);

            expect(mutatedResult).toEqual(result);
            expect(array).toEqual(arrayCopy);
          }
        });
      });

      it('observes new items', () => {
        const array: any = [1, 2, 3, 4, 5];
        const mockObservable = { update: jest.fn() };

        array[ATTACHED_OBSERVABLE_KEY] = mockObservable;

        // Add 3 items via the 3 mutator functions that add items to an array
        (arrayMethods as any).push.call(array, 55);
        (arrayMethods as any).unshift.call(array, 57);
        (arrayMethods as any).splice.call(array, 0, 0, 58);

        // The observation always happen on the last item in the array,
        // therefore the last 3 items should now be observable
        const propertyDescriptors = Object.getOwnPropertyDescriptors(array);
        expect((propertyDescriptors[5].get as any)(true)).toBeInstanceOf(Observable);
        expect((propertyDescriptors[6].get as any)(true)).toBeInstanceOf(Observable);
        expect((propertyDescriptors[7].get as any)(true)).toBeInstanceOf(Observable);
      });

      it('throws an error when reactivity state is disabled', () => {
        const array: any = ['hi', 'there', 'lad', '!'];

        const mockObservable = { update: jest.fn() };

        array[ATTACHED_OBSERVABLE_KEY] = mockObservable;

        setReactivityState(ReactivityState.Disabled);

        patchedMethods.forEach((method) => {
          if (method === 'sort') {
            expect(() => {
              (arrayMethods as any)[method].call(array, (x: number, y: number) => x - y);
            }).toThrowError(REACTIVITY_DISABLED_EXCEPTION);
          } else {
            expect(() => {
              (arrayMethods as any)[method].call(array, 9, 9);
            }).toThrowError(REACTIVITY_DISABLED_EXCEPTION);
          }
        });

        setReactivityState(ReactivityState.Enabled);
      });

      it('collects mutation method events when reactivity state is lazy', () => {
        const array: any = [1, 2, 3, 4];

        const mockObservable = { update: jest.fn() };

        array[ATTACHED_OBSERVABLE_KEY] = mockObservable;

        setReactivityState(ReactivityState.Lazy);

        const mockMutatorMethod = jest.fn(arrayMethods.push);
        mockMutatorMethod.call(array, 55);
        expect(array.indexOf(55)).toBe(-1);

        // the mutation method event should now have been processed
        processReactivityQueue();
        expect(array.indexOf(55)).toBe(4);
        setReactivityState(ReactivityState.Enabled);
      });
    });
  });
});
