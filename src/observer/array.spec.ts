import { arrayMethods } from './array';
import Observable from './observable';
import { ATTACHED_OBSERVABLE_KEY } from '.';

describe('Array observer helper functionality', () => {
  describe('arrayMethods', () => {
    const patchedMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

    it('contains patched array mutator methods', () => {
      patchedMethods.forEach(method => {
        expect(typeof (arrayMethods[method as keyof object] as any)).toBe('function');
        expect((arrayMethods[method as keyof object] as any).name).toBe('mutator');
      });
    });

    test('patched array mutator methods call the attached observable update method when invoked', () => {
      const array: any = [1, 2, 3, 4, 5];
      const mockObservable = { update: jest.fn() };

      array[ATTACHED_OBSERVABLE_KEY] = mockObservable;

      patchedMethods.forEach(method => {
        (arrayMethods as any)[method].call(array);
      });

      expect(mockObservable.update).toBeCalledTimes(patchedMethods.length);
    });

    test('patched array mutator methods still retain their original functionality', () => {
      const array: any = [1, 2, 3, 4, 5];
      const arrayCopy: any = [1, 2, 3, 4, 5];

      const mockObservable = { update: jest.fn() };

      array[ATTACHED_OBSERVABLE_KEY] = mockObservable;
      arrayCopy[ATTACHED_OBSERVABLE_KEY] = mockObservable;

      patchedMethods.forEach(method => {
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

    test('patched array mutator methods observe new items', () => {
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
  });
});
