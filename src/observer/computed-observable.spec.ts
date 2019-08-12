import mockConsole from 'console';
import ComputedObservable from './computed-observable';
import Observable from './observable';

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
  });
});
