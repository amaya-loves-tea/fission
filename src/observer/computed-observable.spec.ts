import mockConsole from 'console';
import ComputedObservable from './computed-observable';
import Observable from './observable';
import { observerState, ObserverState } from './observer-state';

global.console = mockConsole;
mockConsole.error = jest.fn();

describe('Computed Observable', () => {
  it('inherits from Observable', () => {
    expect(new ComputedObservable(() => 5)).toBeInstanceOf(Observable);
  });

  describe('evaluate', () => {
    it('evaluates the computed function passed into the constructor', () => {
      const computed = new ComputedObservable(() => 'value');

      expect(computed.evaluate()).toBe('value');
    });

    it('handles errors gracefully', () => {
      const computed = new ComputedObservable(() => {
        throw new Error('');
      });

      expect(computed.evaluate()).toBeUndefined();
    });

    it('sets observableState to disabled while running to prevent side effects', () => {
      const computed = new ComputedObservable(() => {
        expect(observerState).toBe(ObserverState.Disabled);
        return `5 x 8 = ${5 * 8}`;
      });
      expect(observerState).toBe(ObserverState.Enabled);
      computed.evaluate(); // this line should disable observer state while running
      expect(observerState).toBe(ObserverState.Enabled);
    });
  });
});
