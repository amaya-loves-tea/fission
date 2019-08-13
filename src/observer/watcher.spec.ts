import { observe } from './observer';
import { addPropertyWatcher, removePropertyWatcher } from './watcher';
import { createTestObject } from './observer.spec';

describe('watcher functions', () => {
  describe('addPropertyWatcher', () => {
    it('adds a watcher from a property on an observed object', () => {
      const observed = observe(createTestObject());

      const simpleWatcher = addPropertyWatcher(observed, 'number', jest.fn());
      const arrayWatcher = addPropertyWatcher(observed, 'array.0', jest.fn());
      const nestedWatcher = addPropertyWatcher(observed, 'nestedObject.key', jest.fn());

      observed.number = 50;
      observed.array[0] = 99;
      observed.nestedObject.key = 'new_value';

      expect(simpleWatcher).toBeCalledTimes(1);
      expect(simpleWatcher).toBeCalledWith(50, 5);

      expect(arrayWatcher).toBeCalledTimes(1);
      expect(arrayWatcher).toBeCalledWith(99, 1);

      expect(nestedWatcher).toBeCalledTimes(1);
      expect(nestedWatcher).toBeCalledWith('new_value', 'value');
    });

    it('throws an error when the property is not observable', () => {
      const notObserved = {
        price: 55,
        qty: 20,
      };

      expect(() => {
        addPropertyWatcher(notObserved, 'price', value => console.log(value));
      }).toThrowError(new Error('Property is not observable.'));
    });
  });

  describe('removePropertyWatcher', () => {
    it('removes a watcher from a property on an observed object', () => {
      const observed = observe(createTestObject());

      const simpleWatcher = jest.fn();
      const arrayWatcher = jest.fn();
      const nestedWatcher = jest.fn();

      addPropertyWatcher(observed, 'number', simpleWatcher);
      addPropertyWatcher(observed, 'array.0', arrayWatcher);
      addPropertyWatcher(observed, 'nestedObject.key', nestedWatcher);

      observed.number = 50;
      observed.array[0] = 99;
      observed.nestedObject.key = 'new_value';

      expect(simpleWatcher).toBeCalledTimes(1);
      expect(simpleWatcher).toBeCalledWith(50, 5);

      expect(arrayWatcher).toBeCalledTimes(1);
      expect(arrayWatcher).toBeCalledWith(99, 1);

      expect(nestedWatcher).toBeCalledTimes(1);
      expect(nestedWatcher).toBeCalledWith('new_value', 'value');

      removePropertyWatcher(observed, 'number', simpleWatcher);
      removePropertyWatcher(observed, 'array.0', arrayWatcher);
      removePropertyWatcher(observed, 'nestedObject.key', nestedWatcher);

      simpleWatcher.mockClear();
      arrayWatcher.mockClear();
      nestedWatcher.mockClear();

      observed.number = 10;
      observed.array[0] = 20;
      observed.nestedObject.key = 'old_value';

      expect(simpleWatcher).toBeCalledTimes(0);
      expect(arrayWatcher).toBeCalledTimes(0);
      expect(nestedWatcher).toBeCalledTimes(0);
    });

    it('throws an error when the property is not observable', () => {
      const notObserved = {
        price: 55,
        qty: 20,
      };

      expect(() => {
        removePropertyWatcher(notObserved, 'price', value => console.log(value));
      }).toThrowError(new Error('Property is not observable.'));
    });
  });
});
