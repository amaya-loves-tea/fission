/**
 * Exposes the observer public API.
 */

/** @ignore */
export { observe } from './observer';
export {
  setReactivityState,
  processReactivityQueue,
  purgeReactivityQueue,
} from './reactivity-state';
export { addPropertyWatcher, removePropertyWatcher } from './watcher';
