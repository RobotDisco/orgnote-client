import { test, expect } from 'vitest';
import { extractPathFromRoute } from './extract-path-from-route';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const createMockRoute = (params?: Record<string, string | string[]>): RouteLocationNormalizedLoaded => {
  return {
    params: params || {},
    fullPath: '',
    path: '',
    name: undefined,
    hash: '',
    query: {},
    matched: [],
    redirectedFrom: undefined,
    meta: {},
  } as RouteLocationNormalizedLoaded;
};

test('should extract path from string param', () => {
  const route = createMockRoute({ path: 'notes/my-note.org' });
  const result = extractPathFromRoute(route);
  expect(result).toBe('notes/my-note.org');
});

test('should extract path from array param', () => {
  const route = createMockRoute({ path: ['notes', 'folder', 'file.org'] });
  const result = extractPathFromRoute(route);
  expect(result).toBe('notes/folder/file.org');
});

test('should return undefined when no params available', () => {
  const route = createMockRoute({});
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle empty string param', () => {
  const route = createMockRoute({ path: '' });
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle empty array param', () => {
  const route = createMockRoute({ path: [] });
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle route without params', () => {
  const route = createMockRoute(undefined);
  const result = extractPathFromRoute(route);
  expect(result).toBeUndefined();
});

test('should handle null route', () => {
  const result = extractPathFromRoute(null as unknown as RouteLocationNormalizedLoaded);
  expect(result).toBeUndefined();
});

test('should handle array with single element', () => {
  const route = createMockRoute({ path: ['single.org'] });
  const result = extractPathFromRoute(route);
  expect(result).toBe('single.org');
});

test('should handle deeply nested path', () => {
  const route = createMockRoute({ path: 'deep/path/to/file.org' });
  const result = extractPathFromRoute(route);
  expect(result).toBe('deep/path/to/file.org');
});

test('should handle array with multiple segments', () => {
  const route = createMockRoute({ path: ['a', 'b', 'c', 'file.org'] });
  const result = extractPathFromRoute(route);
  expect(result).toBe('a/b/c/file.org');
});
