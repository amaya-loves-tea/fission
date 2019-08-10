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
