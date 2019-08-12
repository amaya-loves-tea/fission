import consoleReference from 'console';
import { logError, logWarning } from './log';

global.console = consoleReference;
const errorOutput = consoleReference.error;
const warningOutput = consoleReference.warn;

describe('error utility functions', () => {
  describe('logError', () => {
    it('logs an exception to the console', () => {
      consoleReference.error = jest.fn();
      expect(consoleReference.error).not.toBeCalled();

      logError('simple error test', new Error());

      expect(consoleReference.error).toBeCalledTimes(1);

      consoleReference.error = errorOutput;
    });
  });

  describe('logWarning', () => {
    it('logs a warning to the console', () => {
      consoleReference.warn = jest.fn();
      expect(consoleReference.warn).not.toBeCalled();

      logWarning('this is a warning!');

      expect(consoleReference.warn).toBeCalledTimes(1);

      consoleReference.warn = warningOutput;
    });
  });
});
