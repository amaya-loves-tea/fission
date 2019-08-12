import { isObject, isPlainObject, prototypeAugment, navigateToPropertyPath } from './object';

describe('object utility functions', () => {
  class TestClass {
    public property: number;
    public constructor(property: number) {
      this.property = property;
    }
  }

  describe('prototypeAugment', () => {
    it("adds source methods to target's prototype", () => {
      const sourceObject = {
        method: jest.fn(),
        member: 5,
      };
      const targetObject: any[] = [];

      prototypeAugment(targetObject, sourceObject);

      expect(Object.getPrototypeOf(targetObject)).toBe(sourceObject);
    });

    it('gracefully fails if the parameters passed in are not objects', () => {
      const sourceObject = 'test';
      const targetObject = 1;

      // @ts-ignore
      prototypeAugment(targetObject, sourceObject);

      expect(Object.getPrototypeOf(targetObject)).not.toBe(sourceObject);
    });
  });

  describe('isObject', () => {
    it('correctly identifies object types', () => {
      // Primitives
      expect(isObject(true)).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(125)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(Symbol('symbol'))).toBe(false);

      // Functions
      expect(isObject(() => 5)).toBe(false);
      expect(
        isObject(function() {
          return 'test';
        }),
      ).toBe(false);

      // Objects
      expect(isObject(new Object())).toBe(true);
      expect(isObject([])).toBe(true);
      expect(isObject({ property: 'test' })).toBe(true);
      expect(isObject(new TestClass(66))).toBe(true);
      expect(isObject([])).toBe(true);
    });
  });

  describe('isPlainObject', () => {
    it('correctly identifies plain objects', () => {
      // Primitives
      expect(isPlainObject(true)).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject(125)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(Symbol('symbol'))).toBe(false);

      // Functions
      expect(isPlainObject(() => 5)).toBe(false);
      expect(
        isPlainObject(function() {
          return 'test';
        }),
      ).toBe(false);

      // Objects
      expect(isPlainObject(new Object())).toBe(true);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject({ property: 'test' })).toBe(true);
      expect(isPlainObject(new TestClass(66))).toBe(false);
      expect(isPlainObject([])).toBe(false);
    });
  });

  describe('navigateToPropertyPath', () => {
    it('calls a callback when it finds the property from the specified path', () => {
      const obj = {
        prop: 55,
        nested: {
          nestedAgain: {
            prop: 50,
          },
        },
      };

      const spy = jest.fn();
      navigateToPropertyPath(obj, 'nested.nestedAgain.prop', spy);

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith(obj.nested.nestedAgain, 'prop');
    });

    it('is able to navigate into array properties', () => {
      const object = {
        nested: {
          array: [{ name: 'test' }, { name: 'anotherTest' }],
        },
      };

      navigateToPropertyPath(object, 'nested.array.0.name', (obj, key) => {
        expect(obj).toHaveProperty(key);
        expect(obj[key as keyof object]).toBe('test');
      });
    });

    it('throws an error if it cannot find the property', () => {
      const obj = {
        prop: 55,
        nested: {
          nestedAgain: {
            prop: 50,
          },
        },
      };
      expect(() => navigateToPropertyPath(obj, 'nested.nestedAgain.props', jest.fn())).toThrowError(
        `Object does not contain the property with path 'nested.nestedAgain.props'`,
      );
    });
  });
});
