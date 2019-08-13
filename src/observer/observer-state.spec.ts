import {
  setObserverState,
  ObserverState,
  observerState,
  addObserverQueueItem,
  processObserverQueue,
  purgeObserverQueue,
} from './observer-state';

// TODO:
describe('observer-state', () => {
  describe('observerState', () => {
    it('is enabled by default', () => {
      expect(observerState).toBe(ObserverState.Enabled);
    });
  });

  describe('setObserverState', () => {
    it('sets observer state to a new value', () => {
      setObserverState(ObserverState.Disabled);
      expect(observerState).toBe(ObserverState.Disabled);

      setObserverState(ObserverState.Lazy);
      expect(observerState).toBe(ObserverState.Lazy);

      setObserverState(ObserverState.Enabled);
      expect(observerState).toBe(ObserverState.Enabled);
    });

    it('ignores invalid values for observerState', () => {
      expect(observerState).toBe(ObserverState.Enabled);
      setObserverState('INVALID' as any);
      expect(observerState).toBe(ObserverState.Enabled);
    });
  });

  describe('addObserverQueueItem', () => {
    it('adds a new observation item to the observerQueue', () => {
      const mockObserver = jest.fn();
      addObserverQueueItem({ func: mockObserver, args: undefined as any });
      processObserverQueue();
      expect(mockObserver).toBeCalledTimes(1);
    });
  });

  describe('processObserverQueue', () => {
    it('executes the functions stored in the observerQueue', () => {
      const mockObserver = jest.fn();
      const args = [1, 2, 3];
      addObserverQueueItem({ func: mockObserver, args });
      processObserverQueue();
      expect(mockObserver).toBeCalledTimes(1);
      expect(mockObserver).toBeCalledWith(...args);
    });

    it('executes the functions stored in the observerQueue regardless of observerState', () => {
      const mockObserver = jest.fn();
      const args = [1, 2, 3];
      setObserverState(ObserverState.Disabled);
      addObserverQueueItem({ func: mockObserver, args });
      processObserverQueue();
      expect(mockObserver).toBeCalledTimes(1);
      expect(mockObserver).toBeCalledWith(...args);
      setObserverState(ObserverState.Enabled);
    });
  });

  describe('purgeObserverQueue', () => {
    it('removes all items from the observerQueue', () => {
      const mockObserver = jest.fn();
      addObserverQueueItem({ func: mockObserver, args: undefined as any });
      processObserverQueue();
      expect(mockObserver).toBeCalledTimes(1);

      // no further calls should be expected
      purgeObserverQueue();
      processObserverQueue();
      expect(mockObserver).toBeCalledTimes(1);
    });
  });
});
