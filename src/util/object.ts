import { Obj } from '../types';

/**
 * Add an object's functionality to your target object's prototype chain.
 *
 * @param target - Target object to augment.
 * @param source - Source to use for augmentation.
 */
export function prototypeAugment(target: Obj, source: Obj): Obj {
  if (typeof target === 'object' && typeof source === 'object') {
    (target as any).__proto__ = source;
  }
  return target;
}

/**
 * Checks if the provided value is an object.
 *
 * @param value - Value to check.
 */
export function isObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' ? true : false;
}

/**
 * Checks if the provided value is a plain javascript object.
 *
 * @param value - Value to check.
 */
export function isPlainObject(value: unknown): boolean {
  return isObject(value) && (value as Obj).constructor === Object ? true : false;
}

/**
 * Traverses a string path for an object to find the property it is pointing to.
 *
 * Once the property is found a callback function is called passing in the property's parent object and the property name.
 *
 * ```typescript
 * const data = {
 *   nested: {
 *    anotherNested: {
 *      property: 'value',
 *      number: 66
 *    }
 *   }
 * };
 *
 * navigateToPropertyPath(data, 'nested.anotherNested.property', (obj, property) => {
 *  console.log(obj, property);
 * });
 *
 * // output: {property: 'value', number: 66} property
 * ```
 *
 * @param obj - Object to traverse.
 * @param path - Path to a property on the obj.
 * @param callback - Callback to be called when the property is found.
 */
export function navigateToPropertyPath<T extends Obj>(
  obj: T,
  path: string,
  callback: (obj: Obj, key: string) => void,
): void {
  const properties = path.split('.');
  let property: string;

  for (let i = 0; i < properties.length; i++) {
    if (properties[i] in obj) {
      property = properties[i];
      if (i !== properties.length - 1) {
        obj = obj[property as keyof Obj] as T;
      }
    } else {
      throw new Error(`Object does not contain the property with path '${path}'`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  callback(obj, property!);
}
