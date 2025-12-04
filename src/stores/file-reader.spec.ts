import { test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileReaderStore } from './file-reader';

const mockNotify = vi.fn();

vi.mock('./notifications', () => ({
  useNotificationsStore: () => ({
    notify: mockNotify,
  }),
}));

vi.mock('src/boot/i18n', () => ({
  i18n: {
    global: {
      t: (key: string) => key,
    },
  },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  mockNotify.mockClear();
});

test('file-reader addReader registers a single reader correctly', async () => {
  const fileReaderStore = useFileReaderStore();
  const mockReader = vi.fn();

  fileReaderStore.addReader('\\.org$', mockReader);

  await fileReaderStore.openFile('test.org');

  expect(mockReader).toHaveBeenCalledWith('test.org');
});

test('file-reader addReaders registers multiple readers correctly', async () => {
  const fileReaderStore = useFileReaderStore();
  const orgReader = vi.fn();
  const tomlReader = vi.fn();

  fileReaderStore.addReaders({
    '\\.org$': orgReader,
    '\\.toml$': tomlReader,
  });

  await fileReaderStore.openFile('config.toml');
  expect(tomlReader).toHaveBeenCalledWith('config.toml');

  await fileReaderStore.openFile('notes.org');
  expect(orgReader).toHaveBeenCalledWith('notes.org');
});

test('file-reader addReaders does not overwrite existing readers when patterns differ', async () => {
  const fileReaderStore = useFileReaderStore();
  const existingReader = vi.fn();
  const newReader = vi.fn();

  fileReaderStore.addReader('\\.md$', existingReader);
  fileReaderStore.addReaders({
    '\\.toml$': newReader,
  });

  await fileReaderStore.openFile('readme.md');
  expect(existingReader).toHaveBeenCalledWith('readme.md');

  await fileReaderStore.openFile('config.toml');
  expect(newReader).toHaveBeenCalledWith('config.toml');
});

test('file-reader openFile shows notification when no reader matches', async () => {
  const fileReaderStore = useFileReaderStore();

  await fileReaderStore.openFile('unknown.xyz');

  expect(mockNotify).toHaveBeenCalledWith({
    message: expect.stringContaining('unknown.xyz'),
    level: 'warning',
  });
});

test('file-reader reader pattern matches correctly with regex', async () => {
  const fileReaderStore = useFileReaderStore();
  const configReader = vi.fn();

  fileReaderStore.addReader('config.*\\.toml$', configReader);

  await fileReaderStore.openFile('config.local.toml');
  expect(configReader).toHaveBeenCalledWith('config.local.toml');
});

test('file-reader addReaders overwrites reader with same pattern', async () => {
  const fileReaderStore = useFileReaderStore();
  const firstReader = vi.fn();
  const secondReader = vi.fn();

  fileReaderStore.addReader('\\.toml$', firstReader);
  fileReaderStore.addReaders({
    '\\.toml$': secondReader,
  });

  await fileReaderStore.openFile('config.toml');

  expect(firstReader).not.toHaveBeenCalled();
  expect(secondReader).toHaveBeenCalledWith('config.toml');
});
