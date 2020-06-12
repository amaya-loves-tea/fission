import mockConsole from 'console';
import ComputedObservable from './computed-observable';
import Observable from './observable';
import { reactivityState, ReactivityState } from './reactivity-state';

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
        expect(reactivityState).toBe(ReactivityState.Disabled);
        return `5 x 8 = ${5 * 8}`;
      });
      expect(reactivityState).toBe(ReactivityState.Enabled);
      computed.evaluate(); // this line should disable reactivity state while running
      expect(reactivityState).toBe(ReactivityState.Enabled);
    });
  });

  describe('update', () => {
    it('calls the observable update method when the value passed is different from the current value', () => {
      const computed: any = new ComputedObservable(Date.now);

      // Need a timeout to ensure the date returned using Date.now is different
      return timeout(100).then(() => {
        // Wrap the observable class update function
        const updateFunction = jest.fn(computed.__proto__.__proto__.update);
        computed.__proto__.__proto__.update = updateFunction;

        const value = computed.evaluate();

        computed.update(value);

        expect(updateFunction).toBeCalledTimes(1);
        expect(updateFunction).toBeCalledWith(value);
      });
    });

    it('does not call the observable update method when the value passed is the same as the current value', () => {
      const computed: any = new ComputedObservable(() => 5);

      // Wrap the observable class update function
      const updateFunction = jest.fn(computed.__proto__.__proto__.update);
      computed.__proto__.__proto__.update = updateFunction;

      const value = computed.evaluate();

      computed.update(value);

      expect(updateFunction).toBeCalledTimes(0);
    });
  });
});

function timeout(time: number) {
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
