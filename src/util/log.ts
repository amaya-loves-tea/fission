/**
 * Logs an error to the console.
 *
 * @param message - Additional information about the exception.
 * @param exception - Exception.
 */
export function logError(message: string, exception: Error): void {
  console.error(`[Reactivity Error]: ${message}\n${exception.stack}`);
}

/**
 * Logs a warning to the console.
 *
 * @param message - Warning message.
 */
export function logWarning(message: string): void {
  console.warn(`[Reactivity Warning]: ${message}`);
}
