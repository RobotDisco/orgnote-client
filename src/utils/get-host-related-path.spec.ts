import { test, expect, afterEach } from 'vitest';
import { getHostRelatedPath } from './get-host-related-path';

const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

const mockLocation = (origin: string, pathname: string) => {
  Object.defineProperty(window, 'location', {
    value: { origin, pathname },
    writable: true,
    configurable: true,
  });
};

test('getHostRelatedPath constructs correct URL with path', () => {
  mockLocation('http://localhost:3000', '/app');

  const result = getHostRelatedPath('notes/today');
  expect(result).toBe('http://localhost:3000/app#/notes/today');
});

test('getHostRelatedPath strips leading slashes from path', () => {
  mockLocation('https://example.com', '/app');

  const result = getHostRelatedPath('/notes/today');
  expect(result).toBe('https://example.com/app#/notes/today');
});

test('getHostRelatedPath handles path with query string', () => {
  mockLocation('https://example.com', '/app');

  const result = getHostRelatedPath('notes/today?foo=bar');
  expect(result).toBe('https://example.com/app#/notes/today?foo=bar');
});

test('getHostRelatedPath handles empty path', () => {
  mockLocation('https://example.com', '/');

  const result = getHostRelatedPath('');
  expect(result).toBe('https://example.com/#/');
});

test('getHostRelatedPath handles root pathname', () => {
  mockLocation('https://example.com', '/');

  const result = getHostRelatedPath('dashboard');
  expect(result).toBe('https://example.com/#/dashboard');
});
