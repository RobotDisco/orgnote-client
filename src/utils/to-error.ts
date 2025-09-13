import type { Result } from 'neverthrow';
import { ResultAsync, ok, err } from 'neverthrow';

const defaultToError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function isPromiseLike<T = unknown>(x: unknown): x is PromiseLike<T> {
  return (
    typeof x === 'object' &&
    x !== null &&
    'then' in x &&
    typeof (x as { then?: unknown }).then === 'function'
  );
}

export function to<TThis, A extends unknown[], R, E = Error>(
  fn: (this: TThis, ...args: A) => Promise<R>,
  mapError?: (e: unknown) => E,
): (this: TThis, ...args: A) => ResultAsync<R, E>;
export function to<TThis, A extends unknown[], R, E = Error>(
  fn: (this: TThis, ...args: A) => R,
  mapError?: (e: unknown) => E,
): (this: TThis, ...args: A) => Result<R, E>;

export function to<TThis, A extends unknown[], R, E = Error>(
  fn: (this: TThis, ...args: A) => R | Promise<R>,
  mapError: (e: unknown) => E = defaultToError as (e: unknown) => E,
) {
  return function (this: TThis, ...args: A): Result<R, E> | ResultAsync<R, E> {
    try {
      const out = fn.apply(this, args);
      if (isPromiseLike<R>(out)) {
        return ResultAsync.fromPromise(out, mapError);
      }
      return ok(out);
    } catch (e) {
      return err(mapError(e));
    }
  };
}
