// Test helper: creates a Promise-returning stub for repository methods without
// triggering `require-await` lint errors in fake implementations.
export const ok = <T>(value: T): Promise<T> => Promise.resolve(value);

export const noop = (): Promise<void> => Promise.resolve();
