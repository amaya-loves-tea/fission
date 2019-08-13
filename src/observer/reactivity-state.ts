/**
 * Helper functionality to get and manipulate the current reactivity state.
 */

/**
 * Represents all the possible reactivity states.
 */
export enum ReactivityState {
  /** All data changes events will throw an exception. */
  Disabled,
  /** All data change events are collected but not run. */
  Lazy,
  /** Data change events immediately execute. */
  Enabled,
}

/**
 * Exception thrown when mutating observed data while reactivity state is disabled.
 */
export const REACTIVITY_DISABLED_EXCEPTION =
  'Cannot assign to a observed property when reactivity is disabled.';

/**
 * Current reactivity state which can be one of [[ReactivityState]]'s values.
 */
export let reactivityState: ReactivityState = ReactivityState.Enabled;

/**
 * Function used to set the current [[reactivityState]].
 *
 * @param state - New value for [[reactivityState]].
 */
export function setReactivityState(state: ReactivityState): void {
  if (state !== reactivityState && state in ReactivityState) {
    reactivityState = state;
  }
}

/**
 * Represents a reactivity action.
 */
interface ReactivityQueueItem {
  /**
   * Function that manipulates observed data.
   */
  func: Function;
  /**
   * Arguments to be provided when calling [[func]].
   */
  args: any[];
  /**
   * Optional context to be used when calling [[func]].
   */
  context?: object;
}

/**
 * Queue of reactivity actions that get collected when [[reactivityState]] is set to [[ReactivityState.Lazy]]
 */
const reactivityActionQueue: ReactivityQueueItem[] = [];

/**
 * Adds a new item to the reactivity action queue.
 *
 * @param item - Item to add.
 */
export function addReactivityQueueItem(item: ReactivityQueueItem): void {
  reactivityActionQueue.push(item);
}

/**
 * Replay the actions currently stored in the [[reactivityActionQueue]].
 */
export function processReactivityQueue(): void {
  const currentReactivityState = reactivityState;
  setReactivityState(ReactivityState.Enabled);
  let item: ReactivityQueueItem;
  while (reactivityActionQueue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    item = reactivityActionQueue.shift()!;
    item.func.apply(item.context, item.args);
  }
  setReactivityState(currentReactivityState);
}

/**
 * Purge all the actions currently in the [[reactivityActionQueue]].
 */
export function purgeReactivityQueue(): void {
  reactivityActionQueue.length = 0;
}
