import {
  setReactivityState,
  ReactivityState,
  reactivityState,
  addReactivityQueueItem,
  processReactivityQueue,
  purgeReactivityQueue,
} from './reactivity-state';

describe('reactivity-state', () => {
  describe('reactivityState', () => {
    it('is enabled by default', () => {
      expect(reactivityState).toBe(ReactivityState.Enabled);
    });
  });

  describe('setReactivityState', () => {
    it('sets reactivity state to a new value', () => {
      setReactivityState(ReactivityState.Disabled);
      expect(reactivityState).toBe(ReactivityState.Disabled);

      setReactivityState(ReactivityState.Lazy);
      expect(reactivityState).toBe(ReactivityState.Lazy);

      setReactivityState(ReactivityState.Enabled);
      expect(reactivityState).toBe(ReactivityState.Enabled);
    });

    it('ignores invalid values for reactivityState', () => {
      expect(reactivityState).toBe(ReactivityState.Enabled);
      setReactivityState('INVALID' as any);
      expect(reactivityState).toBe(ReactivityState.Enabled);
    });
  });

  describe('addObserverQueueItem', () => {
    it('adds a new observation item to the observerQueue', () => {
      const mockObserver = jest.fn();
      addReactivityQueueItem({ func: mockObserver, args: undefined as any });
      processReactivityQueue();
      expect(mockObserver).toBeCalledTimes(1);
    });
  });

  describe('processObserverQueue', () => {
    it('executes the functions stored in the observerQueue', () => {
      const mockObserver = jest.fn();
      const args = [1, 2, 3];
      addReactivityQueueItem({ func: mockObserver, args });
      processReactivityQueue();
      expect(mockObserver).toBeCalledTimes(1);
      expect(mockObserver).toBeCalledWith(...args);
    });

    it('executes the functions stored in the observerQueue regardless of reactivityState', () => {
      const mockObserver = jest.fn();
      const args = [1, 2, 3];
      setReactivityState(ReactivityState.Disabled);
      addReactivityQueueItem({ func: mockObserver, args });
      processReactivityQueue();
      expect(mockObserver).toBeCalledTimes(1);
      expect(mockObserver).toBeCalledWith(...args);
      setReactivityState(ReactivityState.Enabled);
    });
  });

  describe('purgeObserverQueue', () => {
    it('removes all items from the observerQueue', () => {
      const mockObserver = jest.fn();
      addReactivityQueueItem({ func: mockObserver, args: undefined as any });
      processReactivityQueue();
      expect(mockObserver).toBeCalledTimes(1);

      // no further calls should be expected
      purgeReactivityQueue();
      processReactivityQueue();
      expect(mockObserver).toBeCalledTimes(1);
    });
  });
});
