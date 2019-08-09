import { isObject } from 'util';
import { isPlainObject, prototypeAugment } from '../../src/util';

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
});
