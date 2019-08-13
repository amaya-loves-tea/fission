import Observable from './observable';
import { defineReactiveProperty, ATTACHED_OBSERVABLE_KEY, observe } from './observer';
import ComputedObservable from './computed-observable';
import { prototypeAugment, isObject } from '../util';
import { arrayMethods } from './array';
import { extractObservableFromProperty } from './observer';
import {
  setObserverState,
  ObserverState,
  OBSERVER_STATE_DISABLED_EXCEPTION,
  processObserverQueue,
} from './observer-state';

describe('observer', () => {
  describe('defineReactiveProperty', () => {
    describe('creates a reactive property', () => {
      it('has the same value as the observable', () => {
        const target: any = {};
        defineReactiveProperty(target, 'data', new Observable(80));

        expect(target).toHaveProperty('data');

        expect(target.data).toBe(80);

        const computedObservable = new ComputedObservable(() => target.data * 2);
        computedObservable.update(computedObservable.evaluate());
        defineReactiveProperty(target, 'computed', computedObservable);

        expect(target).toHaveProperty('computed');
        expect(target.computed).toBe(160);
      });

      it('is proxied', () => {
        const target: any = {};
        defineReactiveProperty(target, 'prop', new Observable({ key: 'value' }));

        expect(target).toHaveProperty('prop');

        const propertyDescriptor = Object.getOwnPropertyDescriptor(target, 'prop');

        expect(propertyDescriptor).toBeDefined();
        expect(propertyDescriptor!.get).toBeDefined();
        expect(propertyDescriptor!.set).toBeDefined();
      });

      it('cannot be overridden', () => {
        const target: any = {};

        defineReactiveProperty(target, 'key', new Observable(false));

        expect(target).toHaveProperty('key');

        const propertyDescriptor = Object.getOwnPropertyDescriptor(target, 'key');
        if (propertyDescriptor) {
          expect(propertyDescriptor.configurable).toBeFalsy();
          expect(propertyDescriptor.enumerable).toBeTruthy();
          expect(propertyDescriptor.writable).toBeFalsy();
        } else {
          fail('property is not reactive');
        }
      });

      it('makes array items reactive', () => {
        const target: any = {};
        defineReactiveProperty(target, 'array', new Observable([]));
        defineReactiveProperty(target.array, 0, new Observable('observed value'));

        validatePropertyObserved(target.array, 0);
      });

      it('allows user defined getters and setters', () => {
        let num = 10;
        const target = {
          // @ts-ignore
          get number(): string | number {
            return num;
          },
          // @ts-ignore
          set number(stringNumber: string) {
            num = Number(stringNumber) * 2;
          },
        };
        defineReactiveProperty(target, 'number', new Observable(10));

        expect(num).toBe(target.number);

        target.number = '13';

        expect(target.number).toBe(num);
        expect(num).toBe(26);
      });

      describe('property getter functionality', () => {
        it('returns the observable value if no argument is passed to the getter', () => {
          const target = {};
          defineReactiveProperty(target, 'key', new Observable(57));

          const propertyDescriptor = Object.getOwnPropertyDescriptor(target, 'key');
          if (propertyDescriptor && propertyDescriptor.get) {
            expect(propertyDescriptor.get()).toBe(57);
          } else {
            fail('property is not reactive');
          }
        });

        it('returns the observable if you pass "true" as the first getter parameter', () => {
          const target = {};
          defineReactiveProperty(target, 'key', new Observable(88));

          const propertyDescriptor = Object.getOwnPropertyDescriptor(target, 'key');
          if (propertyDescriptor && propertyDescriptor.get) {
            expect((propertyDescriptor.get as any)(true)).toBeInstanceOf(Observable);
          } else {
            fail('property is not reactive');
          }
        });
      });

      describe('property setter functionality', () => {
        describe('observerState - enabled', () => {
          it('calls the observable update function when you change the value', () => {
            const data = createTestObject();
            const observables: Observable<any>[] = [];

            const keys = Object.keys(data);
            for (const key of keys) {
              const value = data[key as keyof typeof data];
              const observable = new Observable(value);
              observable.update = jest.fn(observable.update);
              observables.push(observable);

              defineReactiveProperty(data, key, observable);
            }

            data.number = 10;
            data.string = 'new';
            data.boolean = true;

            data.nestedObject.key = 'new keys';
            data.nestedObject.array[0] = 9;
            data.nestedObject.array[1] = 15;
            data.nestedObject.array = [10001, 10002];
            ((data.nestedObject as any) = { name: 'test' }), (data.array[0] = 99);
            (data.array[1] as any)[0] = 22;
            (data.array[1] as any)[1] = 23;
            (data.array[1] as any) = ['new', 'type'];
            (data.array[2] as any).name = 'you';
            (data.array[2] as any) = { key: 'ooo' };

            (data.array as any) = ['hello', 'world', '!'];
            data.getter = 9;
            (data.method as any) = function() {
              return {};
            };

            for (const observable of observables) {
              expect(observable.update).toBeCalledTimes(1);
            }
          });

          it('does not call the observable update function when you change the value to the current value ', () => {
            const data = createTestObject();
            const observables: Observable<any>[] = [];

            const keys = Object.keys(data);
            for (const key of keys) {
              const value = data[key as keyof typeof data];
              const observable = new Observable(value);
              observable.update = jest.fn(observable.update);
              observables.push(observable);

              defineReactiveProperty(data, key, observable);
            }

            // Primitives
            data.number = 5;
            data.getter = 2.5;
            data.string = 'test';
            data.boolean = false;
            data.array[0] = 1;
            (data.array[1] as any)[0] = 2;
            (data.array[1] as any)[1] = 3;
            (data.array[2] as any).name = 'name';
            data.nestedObject.key = 'value';
            data.nestedObject.array[0] = 5;
            data.nestedObject.array[1] = 6;

            /**
             * Objects & Methods
             *
             * These are reference types so you can only get this test to succeed if you reassign the same reference.
             *
             * As an example the following will not work
             * ```typescript
             * observed.nestedObject = { key: 'value' };
             * observed.array = [1, [2, 3], {name: 'name'}];
             * observed.method = function method() { return this.nestedObject; };
             * ```
             */

            /* eslint-disable no-self-assign */
            data.nestedObject.array = data.nestedObject.array;
            data.nestedObject = data.nestedObject;
            data.array[1] = data.array[1];
            data.array[2] = data.array[2];
            data.array = data.array;
            data.method = data.method;
            /* eslint-enable no-self-assign */

            for (const observable of observables) {
              expect(observable.update).not.toBeCalled();
            }
          });

          it('observes the changed value and its properties if the changed value is an object', () => {
            const target: any = {};
            defineReactiveProperty(target, 'nestedObject', new Observable({}));
            defineReactiveProperty(target.nestedObject, 'name', new Observable('test'));
            defineReactiveProperty(target.nestedObject, 'number', new Observable(7));
            defineReactiveProperty(target.nestedObject, 'boolean', new Observable(true));

            expect(target).toEqual({
              nestedObject: {
                name: 'test',
                number: 7,
                boolean: true,
              },
            });

            validateObjectObserved(target);

            target.nestedObject = { key: 99 };

            validateObjectObserved(target);

            expect(target).toEqual({ nestedObject: { key: 99 } });
          });

          it('observes the changed value and its children if the changed value is an array', () => {
            const target: any = {};
            defineReactiveProperty(target, 'array', new Observable([]));
            prototypeAugment(target.array, arrayMethods);
            Object.defineProperty(target.array, ATTACHED_OBSERVABLE_KEY, {
              value: new Observable(undefined),
            });

            defineReactiveProperty(target.array, 0, new Observable(1));

            defineReactiveProperty(target.array, 1, new Observable([]));
            prototypeAugment(target.array[1], arrayMethods);
            Object.defineProperty(target.array[1], ATTACHED_OBSERVABLE_KEY, {
              value: new Observable(undefined),
            });

            defineReactiveProperty(target.array[1], 0, new Observable(true));
            defineReactiveProperty(target.array[1], 1, new Observable(false));

            defineReactiveProperty(target.array, 2, new Observable([]));
            prototypeAugment(target.array[2], arrayMethods);
            Object.defineProperty(target.array[2], ATTACHED_OBSERVABLE_KEY, {
              value: new Observable(undefined),
            });

            defineReactiveProperty(target.array[2], 0, new Observable({}));
            defineReactiveProperty(target.array[2], 1, new Observable({}));
            defineReactiveProperty(target.array[2], 2, new Observable({}));
            defineReactiveProperty(target.array[2][0], 'name', new Observable('larry'));
            defineReactiveProperty(target.array[2][1], 'name', new Observable('moe'));
            defineReactiveProperty(target.array[2][2], 'name', new Observable('curly'));

            expect(target).toEqual({
              array: [1, [true, false], [{ name: 'larry' }, { name: 'moe' }, { name: 'curly' }]],
            });

            validateObjectObserved(target);

            target.array = [
              'test',
              [[1, 2], [true, true]],
              [{ message: 'hi' }, { message: 'go' }, { message: 'there' }],
            ];

            expect(target).toEqual({
              array: [
                'test',
                [[1, 2], [true, true]],
                [{ message: 'hi' }, { message: 'go' }, { message: 'there' }],
              ],
            });

            validateObjectObserved(target);
          });

          it('doest not create a setter if the observable passed in is a computed observable instance', () => {
            const target: any = {};
            const observable = new ComputedObservable(() => 67);
            observable.update(observable.evaluate());
            defineReactiveProperty(target, 'total', observable);

            expect(target.total).toBe(67);

            expect(() => {
              target.total = 55;
            }).toThrowError('Cannot set property total of #<Object> which has only a getter');
          });
        });

        describe('observerState - disabled', () => {
          it('throws an error', () => {
            const target: any = {};
            defineReactiveProperty(target, 'number', new Observable(78));
            setObserverState(ObserverState.Disabled);
            expect(() => (target.number = 100)).toThrowError(OBSERVER_STATE_DISABLED_EXCEPTION);
            setObserverState(ObserverState.Enabled);
          });
        });

        describe('observerState - lazy', () => {
          it('collects data change events in the observerQueue', () => {
            const target: any = {};
            const observable = new Observable('test');
            observable.update = jest.fn(observable.update);
            defineReactiveProperty(target, 'string', observable);
            setObserverState(ObserverState.Lazy);
            target.string = 'new string';
            expect(observable.update).toBeCalledTimes(0);
            processObserverQueue();
            expect(observable.update).toBeCalledTimes(1);
            setObserverState(ObserverState.Enabled);
          });
        });
      });
    });

    it('throws an error if the type being operated on is not an object', () => {
      expect(() =>
        defineReactiveProperty('test' as any, 'invalid', new Observable(5)),
      ).toThrowError('Object.defineProperty called on non-object');
    });
  });

  describe('observe', () => {
    it('accepts a data object and returns an observed data object', () => {
      const data = createTestObject();

      const observed = observe(data);

      expect(observed).toBeDefined();
      expect(observed).toBe(data);
    });

    it('throws an error if the type passed to data is not an object', () => {
      const data = 'test';

      expect(() => observe(data as any)).toThrowError(
        new Error('Parameter provided is not a plain javascript object.'),
      );
    });

    it('recursively makes all data properties reactive', () => {
      const data = createTestObject();

      const observed = observe(data);

      validateObjectObserved(observed);
    });

    it('recursively creates computed properties from function definitions', () => {
      const data = {
        price: 55,
        qty: 10,
        totalValue() {
          return this.price * this.qty;
        },
        nested: {
          list: ['larry', 'moe', 'curly'],
          excludeMoe() {
            return this.list.filter(x => x !== 'moe');
          },
        },
      };

      observe(data);

      Object.defineProperty(data.nested.excludeMoe, SKIP_RECURSIVE_CHECK, { value: true });

      validateObjectObserved(data);

      expect(data.totalValue).toBe(550);
      expect(data.nested.excludeMoe).toEqual(['larry', 'curly']);

      data.price = 100;
      expect(data.totalValue).toBe(1000);
      data.qty = 50;
      expect(data.totalValue).toBe(5000);

      data.nested.list.push('marly');
      expect(data.nested.excludeMoe).toEqual(['larry', 'curly', 'marly']);
    });

    /**
     * This is to avoid the caveats where dynamically adding properties is not observed.
     */
    it('recursively seals objects to prevent properties from being added or deleted to them', () => {
      const validateObjectSealed = (data: object) => {
        for (const key in data) {
          if (isObject(data)) {
            if (!Array.isArray(data)) {
              expect(Object.isSealed(data)).toBe(true);
            }
            validateObjectSealed(data[key as keyof object]);
          }
        }
      };

      const observed = observe({
        building: {
          manager: 'SOMEONE',
          totalUsers(this: { school: { headCount: number }; hospital: { headCount: number } }) {
            return this.school.headCount + this.hospital.headCount;
          },
          school: {
            classes: 88,
            students: [],
            teachers: [],
            terms: 4,
            headCount() {
              return this.students.length + this.teachers.length;
            },
          },
          hospital: {
            doctors: [],
            nurses: [],
            patientCount: 88,
            headCount() {
              return this.doctors.length + this.nurses.length + this.patientCount;
            },
          },
          address: 'SOME ADDRESS',
        },
      });

      validateObjectSealed(observed);
    });

    describe('array mutation methods are observed', () => {
      function wrapArrayItemGetters(array: any[], start: number = 0, end: number = array.length) {
        for (let i = start; i < end; i++) {
          const propertyDescriptor = Object.getOwnPropertyDescriptor(array, i);
          if (propertyDescriptor && propertyDescriptor.get && propertyDescriptor.set) {
            Object.defineProperty(array, i, {
              get: jest.fn(propertyDescriptor.get),
              set: jest.fn(propertyDescriptor.set),
            });
          } else {
            fail('Array is not observable');
          }
        }
      }

      function validateArrayItemSettersCalledOnce(
        array: any[],
        start: number = 0,
        end: number = array.length,
      ) {
        for (let i = start; i < end; i++) {
          const propertyDescriptor = Object.getOwnPropertyDescriptor(array, i)!;
          expect(propertyDescriptor.set).toBeCalledTimes(1);
        }
      }

      function validateMutatorMethod(
        initialArray: any[],
        validatorFunction: (initialArray: any[], observedArray: any[]) => void,
      ) {
        const arrayCopy = initialArray.slice(0);

        const observed = observe({ array: initialArray });

        const observableArray = extractObservableFromProperty(observed, 'array') as Observable<
          any[]
        >;

        if (observableArray && observableArray.value) {
          observableArray.update = jest.fn(observableArray.update);

          // Function is mutator function
          expect(observableArray.value.pop.name).toBe('mutator');

          // Validate original functionality
          validatorFunction(arrayCopy, observableArray.value);

          // Check items are still observable
          validateArrayItemsObservable(observableArray.value);

          // Function caused the array observable to be re-evaluated
          expect(observableArray.update).toBeCalled();
        } else {
          fail('array is not observable');
        }
      }

      function validateArrayItemsObservable(
        array: any[],
        start: number = 0,
        end: number = array.length,
      ) {
        for (let i = start; i < end; i++) {
          if (isObject(array[i])) {
            validateObjectObserved(array[i]);
          } else {
            validatePropertyObserved(array, i);
          }
        }
      }

      test('pop', () => {
        validateMutatorMethod([1, 2], (initialArray, observedArray) => {
          // Validate original functionality
          const removedItem = observedArray.pop();
          // Removed item was the last item in the array
          expect(removedItem).toBe(initialArray[initialArray.length - 1]);
          // Observed array length is now one less that before
          expect(initialArray.length - 1).toBe(observedArray.length);
        });
      });

      test('push', () => {
        validateMutatorMethod([{ name: 'bob' }, { name: 'joan' }], (_, observedArray) => {
          // Validate original functionality
          // Simple push
          const newLength = observedArray.push(
            { name: 'angie' },
            { name: 'jack' },
            { name: 'morgan' },
          );
          // Result is the same as the new array length
          expect(newLength).toBe(observedArray.length);
          // New items are inserted correctly
          expect(observedArray[observedArray.length - 1]).toEqual({ name: 'morgan' });

          // Merging 2 arrays
          observedArray.push.apply(observedArray, [
            { name: 'josh', dob: { year: 1990, month: 'April', day: 5 } },
            { name: 'john', dob: { year: 1980, month: 'December', day: 21 } },
          ]);
          // Confirm array's are merged
          expect(observedArray.length).toBe(newLength + 2);
          // New items are inserted correctly
          expect(observedArray[observedArray.length - 1]).toEqual({
            name: 'john',
            dob: { year: 1980, month: 'December', day: 21 },
          });
        });
      });

      test('reverse', () => {
        validateMutatorMethod([5, 6, 7, 8], (_, observedArray) => {
          wrapArrayItemGetters(observedArray);

          // Validate original functionality
          const reversedArray = observedArray.reverse();
          // Result is the reversed array
          expect(reversedArray).toEqual([8, 7, 6, 5]);
          // Result is the observedArray
          expect(reversedArray).toBe(observedArray);

          validateArrayItemSettersCalledOnce(observedArray);
        });
      });

      test('shift', () => {
        validateMutatorMethod(
          [[1, 2], ['hi', 'there'], [true, false]],
          (initialArray, observedArray) => {
            // Validate original functionality
            const removedItem = observedArray.shift();
            // Removed item was the first item in the array
            expect(removedItem).toEqual(initialArray[0]);
            // Observed array length is now one less than before
            expect(initialArray.length - 1).toBe(observedArray.length);
          },
        );
      });

      test('sort', () => {
        validateMutatorMethod([1, 6, 3, 'Jan', 'Feb', 'Dec'], (_, observedArray) => {
          // Validate original functionality
          // Simple sort
          let sortedArray = observedArray.sort();
          // Confirm sortedArray is sorted
          expect(sortedArray).toEqual([1, 3, 6, 'Dec', 'Feb', 'Jan']);
          // Sorted array is observed array
          expect(observedArray).toBe(sortedArray);

          // Sort with compare function
          sortedArray = observedArray.sort((a, b) => {
            if (a > b) {
              return -1;
            }
            if (a < b) {
              return 1;
            }
            // names must be equal
            return 0;
          });
          // Confirm sortedArray is sorted
          expect(sortedArray).toEqual([6, 3, 1, 'Jan', 'Feb', 'Dec']);
          // Sorted array is observed array
          expect(observedArray).toBe(sortedArray);
        });
      });

      test('splice', () => {
        validateMutatorMethod([1, 16, 15, 4, 77], (initialArray, observedArray) => {
          // Validate original functionality
          // Remove 2 items
          let removedItems = observedArray.splice(1, 3);
          // Removed 2 items at index 1
          expect(removedItems).toEqual([16, 15, 4]);
          // Items removed from observedArray
          expect(observedArray.length).toBe(initialArray.length - 3);

          // Add some items
          removedItems = observedArray.splice(1, 0, 2, 3);
          // Removed no items and added 2
          expect(removedItems).toEqual([]);
          expect(observedArray[1]).toBe(2);
          expect(observedArray[2]).toBe(3);

          // Removed and added items
          removedItems = observedArray.splice(1, 2, 4, 5);
          expect(removedItems).toEqual([2, 3]);
          expect(observedArray[1]).toBe(4);
          expect(observedArray[2]).toBe(5);
        });
      });

      test('unshift', () => {
        validateMutatorMethod(['hi', 'there'], (initialArray, observedArray) => {
          // Wrap array item getters in mock function
          // Unshift will cause the setters on 'hi' and 'there' to fire since it is reassigning the items.
          wrapArrayItemGetters(observedArray);

          // Validate original functionality
          const newLength = observedArray.unshift('He', 'says', ':');
          // Result is the same as the new array length
          expect(newLength).toBe(observedArray.length);
          // Items are inserted correctly
          expect(observedArray[0]).toBe('He');

          // Confirm setters were called on existing items in the array
          validateArrayItemSettersCalledOnce(observedArray, 0, initialArray.length);
        });
      });
    });

    describe('caveats', () => {
      /**
       * It is impossible to proxy the Array.prototype.length property since it is not configurable.
       */
      test('assigning a new length to an array is not observed', () => {
        const data = createTestObject();

        const observed = observe(data);

        const observable = extractObservableFromProperty(observed, 'array');

        if (observable) {
          observable.update = jest.fn(observable.update);

          observed.array.length = 19;

          expect(observable.update).not.toBeCalled();
        } else {
          fail('array is not observable');
        }
      });
    });
  });

  describe('extractObservableFromProperty', () => {
    it('returns the observable instance for a reactive property', () => {
      const target: any = {};

      defineReactiveProperty(target, 'key', new Observable(55));

      const observable = extractObservableFromProperty(target, 'key');

      expect(observable).toBeDefined();
      expect(observable).toBeInstanceOf(Observable);
    });

    it('returns undefined if this is not a reactive property', () => {
      const target = { name: 'test' };

      const observable = extractObservableFromProperty(target, 'name');

      expect(observable).toBeUndefined();
    });
  });
});

const SKIP_RECURSIVE_CHECK = 'SKIP_RECURSIVE_CHECK';

export function validateObjectObserved(obj: object) {
  const keys = Object.keys(obj);
  for (const key of keys) {
    const value: any = obj[key as keyof object];

    if (isObject(value) && !!value[SKIP_RECURSIVE_CHECK as keyof object]) {
      validateObjectObserved(value);
    }

    validatePropertyObserved(obj, key);
  }
}

export function validatePropertyObserved(obj: object, key: string | number) {
  const value = obj[key as keyof object];

  if (Array.isArray(value)) {
    // Has attached observable instance
    expect((value as any)[ATTACHED_OBSERVABLE_KEY]).toBeInstanceOf(Observable);

    // Has patched mutator methods
    expect(Object.getPrototypeOf(value)).toBe(arrayMethods);

    // Reactive arrays should still register as arrays
    expect(Array.isArray(value));
  }

  const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (propertyDescriptor && propertyDescriptor.get) {
    const getter = propertyDescriptor.get as any;

    expect(getter()).toBe(value);

    const observable = getter(true);
    expect(observable).toBeInstanceOf(Observable);
  } else {
    fail(`Property ${key} is not observable`);
  }
}

/**
 * DO NOT CHANGE THIS DATA AS IT WILL INVALIDATE THE TESTS THAT DEPEND ON THEM
 */
export function createTestObject() {
  let getterValue = 5;
  return {
    number: 5,
    string: 'test',
    boolean: false,
    nestedObject: { key: 'value', array: [5, 6] },
    array: [1, [2, 3], { name: 'name' }],
    get getter() {
      return getterValue;
    },
    set getter(value: any) {
      getterValue = value * 2;
    },
    method() {
      return this.nestedObject;
    },
  };
}
