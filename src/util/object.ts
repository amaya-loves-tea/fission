/**
 * Add an object's functionality to your target's prototype chain.
 *
 * @param target - Target object to augment.
 * @param source - Source to use for augmentation.
 */
export function prototypeAugment(target: object, source: object): object {
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
export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' ? true : false;
}

/**
 * Checks if the provided value is a plain javascript object.
 *
 * @param value - Value to check.
 */
export function isPlainObject(value: any): boolean {
  return isObject(value) && value.constructor === Object ? true : false;
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
export function navigateToPropertyPath<T extends object>(
  obj: T,
  path: string,
  callback: (obj: object, key: string) => void,
): void {
  const properties = path.split('.');
  let property: string;

  for (let i = 0; i < properties.length; i++) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(properties[i])) {
      property = properties[i];
      if (i !== properties.length - 1) {
        obj = obj[property as keyof object];
      }
    } else {
      throw new Error(`Object does not contain the property with path '${path}'`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  callback(obj, property!);
}
