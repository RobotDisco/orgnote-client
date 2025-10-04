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

test('debounce works with dynamic delay function', async () => {
  const mockFunction = vi.fn();
  const delayGetter = vi.fn(() => 100);
  const debouncedFunction = debounce(mockFunction, delayGetter);

  debouncedFunction();

  expect(delayGetter).toHaveBeenCalledTimes(1);
  expect(mockFunction).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(mockFunction).toHaveBeenCalledTimes(1);
});

test('debounce calls delay getter on each invocation', async () => {
  const mockFunction = vi.fn();
  const delayRef = { value: 100 };
  const delayGetter = vi.fn(() => delayRef.value);
  const debouncedFunction = debounce(mockFunction, delayGetter);

  // First call
  debouncedFunction();
  expect(delayGetter).toHaveBeenCalledTimes(1);

  // Second call (resets timer)
  await new Promise((resolve) => setTimeout(resolve, 50));
  debouncedFunction();
  expect(delayGetter).toHaveBeenCalledTimes(2);

  // Third call (resets timer again)
  await new Promise((resolve) => setTimeout(resolve, 30));
  debouncedFunction();
  expect(delayGetter).toHaveBeenCalledTimes(3);

  // Wait for final execution
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(mockFunction).toHaveBeenCalledTimes(1);
});

test('debounce uses updated delay from getter function', async () => {
  const mockFunction = vi.fn();
  const delayRef = { value: 200 };
  const delayGetter = vi.fn(() => delayRef.value);
  const debouncedFunction = debounce(mockFunction, delayGetter);

  // First call with 200ms delay
  debouncedFunction();
  expect(delayGetter).toHaveBeenCalledTimes(1);

  // Change delay to 50ms
  delayRef.value = 50;

  // Second call should use new delay
  await new Promise((resolve) => setTimeout(resolve, 30));
  debouncedFunction();
  expect(delayGetter).toHaveBeenCalledTimes(2);

  // Should execute after 50ms from second call
  await new Promise((resolve) => setTimeout(resolve, 70));
  expect(mockFunction).toHaveBeenCalledTimes(1);
});
