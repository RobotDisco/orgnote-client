import { debounce } from './debounce';
import { test, vi, expect } from 'vitest';

test('debounce calls the function after the specified delay', async () => {
  const mockFunction = vi.fn();
  const debouncedFunction = debounce(mockFunction, 100);

  debouncedFunction();

  expect(mockFunction).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(mockFunction).toHaveBeenCalledTimes(1);
});

test('debounce resets the timer if called repeatedly', async () => {
  const mockFunction = vi.fn();
  const debouncedFunction = debounce(mockFunction, 100);

  debouncedFunction();

  // Wait 50ms and call again to reset timer
  await new Promise((resolve) => setTimeout(resolve, 50));
  debouncedFunction();

  // Wait another 50ms and call again to reset timer
  await new Promise((resolve) => setTimeout(resolve, 40));
  debouncedFunction();

  // Wait for the debounce delay to complete
  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(mockFunction).toHaveBeenCalledTimes(1);
});

test('debounce works with arguments', async () => {
  const mockFunction = vi.fn();
  const debouncedFunction = debounce(mockFunction, 100);

  debouncedFunction('test', 42);

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(mockFunction).toHaveBeenCalledTimes(1);
  expect(mockFunction).toHaveBeenCalledWith('test', 42);
});

test('debounce does not call the function if canceled before delay', async () => {
  const mockFunction = vi.fn();
  const debouncedFunction = debounce(mockFunction, 100);

  debouncedFunction();
  debouncedFunction(); // Call again to reset the timer

  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(mockFunction).not.toHaveBeenCalled();
});
