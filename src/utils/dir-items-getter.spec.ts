import { test, expect, vi } from 'vitest';
import { walkDir } from './dir-items-getter';
import type { DiskFile } from 'orgnote-api';

const createMockFile = (path: string, type: 'file' | 'directory' = 'file'): DiskFile => ({
  path,
  name: path.split('/').pop() || '',
  type,
  size: 0,
  mtime: Date.now(),
});

test('walkDir returns empty array for empty directory', async () => {
  const readDir = vi.fn().mockResolvedValue([]);

  const result = await walkDir(readDir, '/', true);

  expect(result).toEqual([]);
  expect(readDir).toHaveBeenCalledWith('/');
});

test('walkDir returns files when includeFiles is true', async () => {
  const files = [createMockFile('/file1.org'), createMockFile('/file2.org')];
  const readDir = vi.fn().mockResolvedValue(files);

  const result = await walkDir(readDir, '/', true);

  expect(result).toEqual(files);
});

test('walkDir excludes files when includeFiles is false', async () => {
  const items = [createMockFile('/file1.org'), createMockFile('/folder', 'directory')];
  const readDir = vi.fn().mockImplementation((path: string) => {
    if (path === '/') return Promise.resolve(items);
    return Promise.resolve([]);
  });

  const result = await walkDir(readDir, '/', false);

  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe('directory');
});

test('walkDir recursively traverses directories', async () => {
  const rootItems = [createMockFile('/folder', 'directory'), createMockFile('/root.org')];
  const nestedItems = [createMockFile('/folder/nested.org')];

  const readDir = vi.fn().mockImplementation((path: string) => {
    if (path === '/') return Promise.resolve(rootItems);
    if (path === '/folder') return Promise.resolve(nestedItems);
    return Promise.resolve([]);
  });

  const result = await walkDir(readDir, '/', true);

  expect(result).toHaveLength(3);
  expect(readDir).toHaveBeenCalledWith('/');
  expect(readDir).toHaveBeenCalledWith('/folder');
});

test('walkDir handles deeply nested directories', async () => {
  const readDir = vi.fn().mockImplementation((path: string) => {
    if (path === '/') return Promise.resolve([createMockFile('/a', 'directory')]);
    if (path === '/a') return Promise.resolve([createMockFile('/a/b', 'directory')]);
    if (path === '/a/b') return Promise.resolve([createMockFile('/a/b/file.org')]);
    return Promise.resolve([]);
  });

  const result = await walkDir(readDir, '/', true);

  expect(result).toHaveLength(3);
  expect(result.map((f) => f.path)).toEqual(['/a', '/a/b', '/a/b/file.org']);
});

test('walkDir includes both files and directories when includeFiles is true', async () => {
  const items = [
    createMockFile('/folder', 'directory'),
    createMockFile('/file.org', 'file'),
  ];
  const readDir = vi.fn().mockImplementation((path: string) => {
    if (path === '/') return Promise.resolve(items);
    return Promise.resolve([]);
  });

  const result = await walkDir(readDir, '/', true);

  expect(result).toHaveLength(2);
  expect(result.some((f) => f.type === 'directory')).toBe(true);
  expect(result.some((f) => f.type === 'file')).toBe(true);
});

test('walkDir collects files from multiple nested directories', async () => {
  const readDir = vi.fn().mockImplementation((path: string) => {
    if (path === '/') {
      return Promise.resolve([
        createMockFile('/dir1', 'directory'),
        createMockFile('/dir2', 'directory'),
      ]);
    }
    if (path === '/dir1') return Promise.resolve([createMockFile('/dir1/a.org')]);
    if (path === '/dir2') return Promise.resolve([createMockFile('/dir2/b.org')]);
    return Promise.resolve([]);
  });

  const result = await walkDir(readDir, '/', true);

  expect(result).toHaveLength(4);
  expect(result.map((f) => f.path)).toContain('/dir1/a.org');
  expect(result.map((f) => f.path)).toContain('/dir2/b.org');
});
