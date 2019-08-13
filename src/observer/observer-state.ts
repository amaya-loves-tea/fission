/**
 * Helper functionality to get and manipulate observer state.
 */

/**
 * Represents all the states that the observer can be in.
 */
export enum ObserverState {
  Disabled,
  Lazy,
  Enabled,
}

/**
 * Exception thrown when mutating observed data while observer state is disabled.
 */
export const OBSERVER_STATE_DISABLED_EXCEPTION =
  'Cannot assign to a observed property when reactivity is disabled.';

/**
 * Current observation state which can be one of [[ObserverState]]'s values.
 */
export let observerState: ObserverState = ObserverState.Enabled;

/**
 * Function used to set the current [[observerState]].
 *
 * @param state - New value for [[observerState]].
 */
export function setObserverState(state: ObserverState): void {
  if (state !== observerState && state in ObserverState) {
    observerState = state;
  }
}

/**
 * Represents a observation action.
 */
interface ObserverQueueItem {
  func: Function;
  args: any[];
  context?: object;
}

/**
 * Queue of observation actions that get collected when [[observerState]] is set to [[ObserverState.Lazy]]
 */
const observerQueue: ObserverQueueItem[] = [];

/**
 * Adds a new item to the observer queue.
 *
 * @param item - Item to add.
 */
export function addObserverQueueItem(item: ObserverQueueItem): void {
  observerQueue.push(item);
}

/**
 * Replay the actions currently stored in the [[observerQueue]].
 */
export function processObserverQueue(): void {
  const currentObserverState = observerState;
  setObserverState(ObserverState.Enabled);
  let item: ObserverQueueItem;
  while (observerQueue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    item = observerQueue.shift()!;
    item.func.apply(item.context, item.args);
  }
  setObserverState(currentObserverState);
}

/**
 * Purge all the actions currently in the [[observerQueue]].
 */
export function purgeObserverQueue(): void {
  observerQueue.length = 0;
}
