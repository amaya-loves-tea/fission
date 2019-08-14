/**
 * Exposes the observer public API.
 */

/** @ignore */
export { observe, extractObservableFromProperty } from './observer';
export {
  setReactivityState,
  processReactivityQueue,
  purgeReactivityQueue,
} from './reactivity-state';
export { addPropertyWatcher, removePropertyWatcher } from './watcher';
