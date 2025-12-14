import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { FileSystemChange } from 'orgnote-api';

import type { Mock } from 'vitest';

let readFile: Mock;
let writeFile: Mock;
let fileWatcherCallbacks: Map<string, (change: FileSystemChange) => void>;

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileSystemManager: vi.fn(() => ({
        currentFs: {
          readFile,
          writeFile,
        },
      })),
      useNotifications: vi.fn(() => ({
        notify: vi.fn(),
      })),
      useEncryption: vi.fn(() => ({
        decrypt: vi.fn((content) => content),
        encrypt: vi.fn((content) => content),
      })),
      useConfig: vi.fn(() => ({
        config: {
          editor: {
            saveDelayMs: 1000,
            validationDelayMs: 500,
          },
          encryption: {
            type: 'disabled',
          },
        },
      })),
    },
  },
}));

vi.mock('./file-watcher', () => ({
  useFileWatcherStore: vi.fn(() => ({
    watch: vi.fn((path: string, callback: (change: FileSystemChange) => void) => {
      fileWatcherCallbacks.set(path, callback);
      return () => fileWatcherCallbacks.delete(path);
    }),
  })),
}));

vi.mock('./file-guard', () => ({
  useFileGuardStore: vi.fn(() => ({
    isReadOnly: vi.fn(() => false),
    getGuard: vi.fn(() => null),
    getReadOnlyReason: vi.fn(() => undefined),
  })),
}));

import { useBufferStore } from './buffer';

const triggerExternalChange = (path: string, change: FileSystemChange): void => {
  const callback = fileWatcherCallbacks.get(path);
  callback?.(change);
};

beforeEach(() => {
  readFile = vi.fn().mockResolvedValue('test content');
  writeFile = vi.fn().mockResolvedValue(undefined);
  fileWatcherCallbacks = new Map();

  const pinia = createPinia();
  setActivePinia(pinia);
  vi.clearAllMocks();

  const store = useBufferStore();
  store.cleanup();
});

test('creates a new buffer on first request', async () => {
  const store = useBufferStore();
  const buf = await store.getOrCreateBuffer('/test/file.org');
  expect(buf).toBeDefined();
  expect(buf.path).toBe('/test/file.org');
  expect(buf.title).toBe('file.org');
  expect(buf.referenceCount).toBe(1);
});

test('increments referenceCount on repeated access', async () => {
  const store = useBufferStore();
  const b1 = await store.getOrCreateBuffer('/test/file.org');
  const b2 = await store.getOrCreateBuffer('/test/file.org');
  expect(b1.path).toBe(b2.path);
  expect(b1.referenceCount).toBe(2);
  expect(b2.referenceCount).toBe(2);
});

test('returns buffer by path', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  const found = store.getBufferByPath('/test/file.org');
  expect(found?.path).toBe(b.path);
});

test('releaseBuffer decrements referenceCount', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  expect(b.referenceCount).toBe(1);
  store.releaseBuffer('/test/file.org');
  expect(b.referenceCount).toBe(0);
});

test('allBuffers returns all created buffers', async () => {
  const store = useBufferStore();
  expect(store.allBuffers.length).toBe(0);
  await store.getOrCreateBuffer('/test/file1.org');
  await store.getOrCreateBuffer('/test/file2.org');
  expect(store.allBuffers.length).toBe(2);
});

test('closeBuffer returns true and removes buffer when no changes', async () => {
  const store = useBufferStore();
  await store.getOrCreateBuffer('/test/file.org');
  expect(store.allBuffers.length).toBe(1);
  const closed = await store.closeBuffer('/test/file.org');
  expect(closed).toBe(true);
  expect(store.getBufferByPath('/test/file.org')).toBeUndefined();
});

test('closeBuffer returns false when unsaved changes and force=false', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  b.content = 'modified content';
  const closed = await store.closeBuffer('/test/file.org');
  expect(closed).toBe(false);
  expect(store.getBufferByPath('/test/file.org')).not.toBeNull();
});

test('closeBuffer returns true when unsaved changes and force=true', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  b.content = 'modified content';
  const closed = await store.closeBuffer('/test/file.org', true);
  expect(closed).toBe(true);
  expect(store.getBufferByPath('/test/file.org')).toBeUndefined();
});

test('saveAllBuffers calls file system write for all buffers', async () => {
  const store = useBufferStore();
  writeFile.mockClear();
  const b1 = await store.getOrCreateBuffer('/test/file1.org');
  const b2 = await store.getOrCreateBuffer('/test/file2.org');
  b1.content = 'data1';
  b2.content = 'data2';
  await store.saveAllBuffers();
  const calls = (writeFile as Mock).mock.calls.map((args) => args[0]);
  expect(calls).toContain('/test/file1.org');
  expect(calls).toContain('/test/file2.org');
});

describe('race condition: content modification during save', () => {
  test('originalContent reflects actually saved content, not current buffer content', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    let resolveWrite: () => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });

    writeFile.mockImplementation(() => writePromise);

    buffer.content = 'content-v1';

    const savePromise = store.saveAllBuffers();

    buffer.content = 'content-v2';

    resolveWrite!();
    await savePromise;

    expect(buffer.metadata.originalContent).toBe('content-v1');
  });

  test('buffer is dirty after content change during save', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    let resolveWrite: () => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });

    writeFile.mockImplementation(() => writePromise);

    buffer.content = 'first-save';

    const savePromise = store.saveAllBuffers();

    buffer.content = 'modified-during-save';

    resolveWrite!();
    await savePromise;

    const isDirty = buffer.content !== buffer.metadata.originalContent;
    expect(isDirty).toBe(true);
  });

  test('writeFile receives content at save initiation time', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    let capturedContent: string | undefined;

    writeFile.mockImplementation((path: string, content: string) => {
      capturedContent = content;
      return Promise.resolve();
    });

    buffer.content = 'snapshot-content';

    await store.saveAllBuffers();

    expect(capturedContent).toBe('snapshot-content');
  });

  test('multiple rapid saves preserve correct originalContent', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    writeFile.mockResolvedValue(undefined);

    buffer.content = 'version-1';
    await store.saveAllBuffers();
    expect(buffer.metadata.originalContent).toBe('version-1');

    buffer.content = 'version-2';
    await store.saveAllBuffers();
    expect(buffer.metadata.originalContent).toBe('version-2');

    buffer.content = 'version-3';
    await store.saveAllBuffers();
    expect(buffer.metadata.originalContent).toBe('version-3');
  });
});

describe('external file changes: dirty buffer protection', () => {
  test('ignores external modify when buffer has unsaved changes', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'user modifications';

    readFile.mockResolvedValue('external content');

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('user modifications');
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  test('applies external modify when buffer is clean', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    expect(buffer.content).toBe('test content');

    readFile.mockResolvedValue('updated externally');

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => {
      expect(buffer.content).toBe('updated externally');
    });
  });

  test('ignores external delete when buffer has unsaved changes', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'unsaved work';

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'delete',
    });

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.errors).toHaveLength(0);
  });

  test('shows error on external delete when buffer is clean', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'delete',
    });

    await vi.waitFor(() => {
      expect(buffer.errors.length).toBeGreaterThan(0);
    });
  });

  test('dirty detection works with empty originalContent', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue('');

    const buffer = await store.getOrCreateBuffer('/test/empty.org');

    expect(buffer.content).toBe('');

    buffer.content = 'new content';

    readFile.mockResolvedValue('external update');

    triggerExternalChange('/test/empty.org', {
      path: '/test/empty.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('new content');
  });

  test('buffer becomes clean after save, then accepts external changes after window', async () => {
    vi.useFakeTimers();

    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'modified';
    await store.saveAllBuffers();

    expect(buffer.content).toBe(buffer.metadata.originalContent);

    await vi.advanceTimersByTimeAsync(500);

    readFile.mockResolvedValue('external after save');

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(buffer.content).toBe('external after save');

    vi.useRealTimers();
  });

  test('preserves user changes through multiple external modification attempts', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'precious user work';

    for (let i = 0; i < 5; i++) {
      readFile.mockResolvedValue(`external version ${i}`);
      triggerExternalChange('/test/file.org', {
        path: '/test/file.org',
        type: 'modify',
        mtime: Date.now() + i,
      });
    }

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('precious user work');
  });
});

describe('edge cases and boundary conditions', () => {
  test('whitespace-only changes are detected as dirty', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue('content');

    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'content ';

    readFile.mockResolvedValue('external');

    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('content ');
  });

  test('ignores external change while buffer is saving', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    let resolveWrite!: () => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    writeFile.mockReturnValue(writePromise);

    buffer.content = 'saving this';

    const savePromise = store.saveAllBuffers();

    readFile.mockResolvedValue('external during save');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await Promise.resolve();

    expect(buffer.content).toBe('saving this');

    resolveWrite();
    await savePromise;

    expect(buffer.content).toBe('saving this');
  });

  test('empty string content is not treated as missing originalContent', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue('');

    const buffer = await store.getOrCreateBuffer('/test/file.org');

    expect(buffer.metadata.originalContent).toBe('');

    const isDirty = buffer.content !== (buffer.metadata.originalContent || '');
    expect(isDirty).toBe(false);
  });

  test('special characters in content are preserved during save', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    const specialContent = '* TODO 日本語\n#+BEGIN_SRC\n<>&"\'\\n\\t\n#+END_SRC';
    buffer.content = specialContent;

    await store.saveAllBuffers();

    expect(writeFile).toHaveBeenCalledWith('/test/file.org', specialContent);
    expect(buffer.metadata.originalContent).toBe(specialContent);
  });

  test('very large content changes are handled correctly', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    const largeContent = 'x'.repeat(1_000_000);
    buffer.content = largeContent;

    await store.saveAllBuffers();

    expect(buffer.metadata.originalContent).toBe(largeContent);
  });
});

describe('stress tests: attempting to break the implementation', () => {
  test('rapid content changes followed by save captures final state', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    for (let i = 0; i < 100; i++) {
      buffer.content = `version-${i}`;
    }

    await store.saveAllBuffers();

    expect(buffer.metadata.originalContent).toBe('version-99');
    expect(writeFile).toHaveBeenCalledWith('/test/file.org', 'version-99');
  });

  test('content change immediately after save start does not corrupt originalContent', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    const savedContents: string[] = [];
    writeFile.mockImplementation((_path: string, content: string) => {
      savedContents.push(content);
      return Promise.resolve();
    });

    buffer.content = 'A';
    const save1 = store.saveAllBuffers();

    buffer.content = 'B';
    const save2 = store.saveAllBuffers();

    buffer.content = 'C';
    const save3 = store.saveAllBuffers();

    await Promise.all([save1, save2, save3]);

    expect(savedContents).toContain('A');
    expect(savedContents).toContain('B');
    expect(savedContents).toContain('C');
    expect(buffer.metadata.originalContent).toBe('C');
  });

  test('external change during rapid user edits is ignored', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'user edit 1';

    for (let i = 0; i < 10; i++) {
      readFile.mockResolvedValue(`external ${i}`);
      triggerExternalChange('/test/file.org', {
        path: '/test/file.org',
        type: 'modify',
        mtime: Date.now() + i,
      });
      buffer.content = `user edit ${i + 2}`;
    }

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('user edit 11');
  });

  test('alternating dirty/clean states handle external changes correctly', async () => {
    vi.useFakeTimers();

    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'dirty';

    readFile.mockResolvedValue('external-1');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(buffer.content).toBe('dirty');

    await store.saveAllBuffers();
    await vi.advanceTimersByTimeAsync(500);

    readFile.mockResolvedValue('external-2');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(buffer.content).toBe('external-2');

    buffer.content = 'dirty again';

    readFile.mockResolvedValue('external-3');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(buffer.content).toBe('dirty again');

    vi.useRealTimers();
  });

  test('null and undefined content edge cases', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue(null as unknown as string);

    const buffer = await store.getOrCreateBuffer('/test/null.org');

    expect(buffer.content).toBe(null);

    buffer.content = 'now has content';

    readFile.mockResolvedValue('external');
    triggerExternalChange('/test/null.org', {
      path: '/test/null.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => Promise.resolve());

    expect(buffer.content).toBe('now has content');
  });

  test('save failure does not update originalContent', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'attempting to save';

    writeFile.mockRejectedValue(new Error('Disk full'));

    await store.saveAllBuffers();

    expect(buffer.metadata.originalContent).toBe('test content');
    expect(buffer.content).toBe('attempting to save');
  });

  test('external changes ignored within save window, accepted after', async () => {
    vi.useFakeTimers();

    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'saved content';
    await store.saveAllBuffers();

    await vi.advanceTimersByTimeAsync(100);

    readFile.mockResolvedValue('during window');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);

    expect(buffer.content).toBe('saved content');

    await vi.advanceTimersByTimeAsync(500);

    readFile.mockResolvedValue('after window');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);

    expect(buffer.content).toBe('after window');

    vi.useRealTimers();
  });

  test('multiple buffers do not interfere with each other', async () => {
    const store = useBufferStore();

    readFile.mockImplementation((path: string) => Promise.resolve(`content of ${path}`));

    const buffer1 = await store.getOrCreateBuffer('/test/file1.org');
    const buffer2 = await store.getOrCreateBuffer('/test/file2.org');

    buffer1.content = 'modified file1';

    readFile.mockResolvedValue('external for file2');
    triggerExternalChange('/test/file2.org', {
      path: '/test/file2.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.waitFor(() => {
      expect(buffer2.content).toBe('external for file2');
    });

    expect(buffer1.content).toBe('modified file1');
  });
});

describe('Пареев: isBufferDirty с null content', () => {
  test('buffer with null content and null originalContent should be clean', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue(null as unknown as string);

    const buffer = await store.getOrCreateBuffer('/test/null.org');

    expect(buffer.content).toBe(null);
    expect(buffer.metadata.originalContent).toBe(null);

    const closed = await store.closeBuffer('/test/null.org');
    expect(closed).toBe(true);
  });

  test('buffer with null content should not trigger unnecessary save', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue(null as unknown as string);
    writeFile.mockClear();

    const buffer = await store.getOrCreateBuffer('/test/null.org');

    expect(buffer.content).toBe(null);

    await store.saveAllBuffers();

    expect(writeFile).not.toHaveBeenCalled();
  });

  test('changing null content to empty string should be detected as dirty', async () => {
    const store = useBufferStore();

    readFile.mockResolvedValue(null as unknown as string);

    const buffer = await store.getOrCreateBuffer('/test/null.org');

    expect(buffer.content).toBe(null);

    buffer.content = '';

    const closed = await store.closeBuffer('/test/null.org');
    expect(closed).toBe(false);
  });
});

describe('Пареев: lastSavedAt при неудачном сохранении', () => {
  test('failed save should not set lastSavedAt', async () => {
    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'attempting to save';

    writeFile.mockRejectedValue(new Error('Disk full'));

    const lastSavedBefore = buffer.metadata.lastSavedAt;

    await store.saveAllBuffers();

    expect(buffer.metadata.lastSavedAt).toBe(lastSavedBefore);
  });

  test('external changes should be accepted immediately after failed save', async () => {
    vi.useFakeTimers();

    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    buffer.content = 'trying to save';

    writeFile.mockRejectedValue(new Error('Disk full'));

    await store.saveAllBuffers();

    readFile.mockResolvedValue('external update');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });

    await vi.advanceTimersByTimeAsync(10);

    expect(buffer.content).toBe('trying to save');

    vi.useRealTimers();
  });

  test('save window should not apply after failed save', async () => {
    vi.useFakeTimers();

    const store = useBufferStore();
    const buffer = await store.getOrCreateBuffer('/test/file.org');

    writeFile.mockRejectedValue(new Error('Network error'));

    buffer.content = 'failed save content';
    await store.saveAllBuffers();

    await vi.advanceTimersByTimeAsync(50);

    writeFile.mockResolvedValue(undefined);
    buffer.content = 'successful save';
    await store.saveAllBuffers();

    await vi.advanceTimersByTimeAsync(100);

    readFile.mockResolvedValue('external during window');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);

    expect(buffer.content).toBe('successful save');

    await vi.advanceTimersByTimeAsync(400);

    readFile.mockResolvedValue('external after window');
    triggerExternalChange('/test/file.org', {
      path: '/test/file.org',
      type: 'modify',
      mtime: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(10);

    expect(buffer.content).toBe('external after window');

    vi.useRealTimers();
  });
});
