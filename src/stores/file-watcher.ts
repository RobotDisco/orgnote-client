import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type {
  DiskFile,
  FileSystemChange,
  FileSystemChangeType,
  FileWatcherListener,
  FileWatcherStartOptions,
  FileWatcherStore,
  FileWatcherWatchOptions,
  WatcherHandle,
} from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useFileSystemStore } from './file-system';

type PathFilter = (path: string) => boolean;

type Snapshot = Map<string, number>;

interface PathSubscription {
  path: string;
  listener: FileWatcherListener;
  recursive: boolean;
}

// TODO: feat/sockets move to config
const DEFAULT_INTERVAL = 3000;

const createChange = (
  path: string,
  type: FileSystemChangeType,
  mtime?: number,
): FileSystemChange => ({ path, type, mtime });

const detectCreatedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...current.entries()]
    .filter(([path]) => !previous.has(path))
    .map(([path, mtime]) => createChange(path, 'create', mtime));

const detectModifiedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...current.entries()]
    .filter(([path, mtime]) => {
      const prevMtime = previous.get(path);
      return prevMtime !== undefined && prevMtime !== mtime;
    })
    .map(([path, mtime]) => createChange(path, 'modify', mtime));

const detectDeletedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...previous.keys()]
    .filter((path) => !current.has(path))
    .map((path) => createChange(path, 'delete'));

const computeChanges = (current: Snapshot, previous: Snapshot): FileSystemChange[] => [
  ...detectCreatedFiles(current, previous),
  ...detectModifiedFiles(current, previous),
  ...detectDeletedFiles(current, previous),
];

const fileToSnapshotEntry = (file: DiskFile): [string, number] => [file.path, file.mtime];

const applyPathFilter = (files: DiskFile[], filter?: PathFilter): DiskFile[] =>
  filter ? files.filter((file) => filter(file.path)) : files;

const getDirectories = (files: DiskFile[]): DiskFile[] =>
  files.filter((f) => f.type === 'directory');

const addFilesToSnapshot = (snapshot: Snapshot, files: DiskFile[], filter?: PathFilter): void => {
  applyPathFilter(files, filter).forEach((file) => {
    const [path, mtime] = fileToSnapshotEntry(file);
    snapshot.set(path, mtime);
  });
};

const scanDirectory = async (
  fs: ReturnType<typeof useFileSystemStore>,
  dirPath: string,
  snapshot: Snapshot,
  filter?: PathFilter,
): Promise<void> => {
  const files = await fs.readDir(dirPath);
  addFilesToSnapshot(snapshot, files, filter);

  const directories = getDirectories(files);
  await Promise.all(directories.map((dir) => scanDirectory(fs, dir.path, snapshot, filter)));
};

const buildSnapshot = async (
  fs: ReturnType<typeof useFileSystemStore>,
  filter?: PathFilter,
): Promise<Snapshot> => {
  const snapshot = new Map<string, number>();
  await scanDirectory(fs, '/', snapshot, filter);
  return snapshot;
};

const hasNativeWatch = (fsManager: ReturnType<typeof useFileSystemManagerStore>): boolean =>
  !!fsManager.currentFs?.watch;

const isFirstLevelChild = (changePath: string, watchPath: string): boolean => {
  const relativePath = changePath.slice(watchPath.length);
  return !relativePath.includes('/');
};

const isPathMatch = (changePath: string, watchPath: string, recursive: boolean): boolean => {
  if (changePath === watchPath) {
    return true;
  }

  const normalizedWatchPath = watchPath.endsWith('/') ? watchPath : `${watchPath}/`;
  const isInside = changePath.startsWith(normalizedWatchPath);

  if (!isInside) {
    return false;
  }

  if (recursive) {
    return true;
  }

  return isFirstLevelChild(changePath, normalizedWatchPath);
};

const findMatchingSubscriptions = (
  change: FileSystemChange,
  subscriptions: PathSubscription[],
): PathSubscription[] =>
  subscriptions.filter((sub) => isPathMatch(change.path, sub.path, sub.recursive));

export const useFileWatcherStore = defineStore<'file-watcher', FileWatcherStore>(
  'file-watcher',
  () => {
    const fsManager = useFileSystemManagerStore();
    const fs = useFileSystemStore();

    const isWatching = ref(false);
    const snapshot = shallowRef<Snapshot>(new Map());
    const subscriptions = ref<PathSubscription[]>([]);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let nativeWatcherHandle: WatcherHandle | null = null;
    let currentOptions: FileWatcherStartOptions = {};

    const notifySubscribers = (change: FileSystemChange): void => {
      const matching = findMatchingSubscriptions(change, subscriptions.value);
      matching.forEach((sub) => sub.listener(change));
    };

    const matchesFilter = (path: string): boolean => {
      if (!currentOptions.fileFilter) {
        return true;
      }
      return currentOptions.fileFilter(path);
    };

    const handleNativeChange = (change: FileSystemChange): void => {
      if (!matchesFilter(change.path)) {
        return;
      }
      notifySubscribers(change);
    };

    const scan = async (): Promise<void> => {
      const previousSnapshot = snapshot.value;
      const currentSnapshot = await buildSnapshot(fs, currentOptions.fileFilter);
      const detected = computeChanges(currentSnapshot, previousSnapshot);

      snapshot.value = currentSnapshot;
      detected.forEach(notifySubscribers);
    };

    const startNativeWatch = async (): Promise<boolean> => {
      if (!hasNativeWatch(fsManager)) {
        return false;
      }

      const handle = await fsManager.currentFs!.watch!(handleNativeChange);
      nativeWatcherHandle = handle;
      return true;
    };

    const startPolling = (): void => {
      const interval = currentOptions.interval ?? DEFAULT_INTERVAL;
      intervalId = setInterval(() => void scan(), interval);
      void scan();
    };

    const start = async (options: FileWatcherStartOptions = {}): Promise<void> => {
      if (isWatching.value) {
        return;
      }

      currentOptions = options;
      isWatching.value = true;

      const nativeStarted = await startNativeWatch();
      if (nativeStarted) {
        return;
      }

      startPolling();
    };

    const stopNativeWatch = async (): Promise<void> => {
      if (!nativeWatcherHandle) {
        return;
      }
      await nativeWatcherHandle.stop();
      nativeWatcherHandle = null;
    };

    const stopPolling = (): void => {
      if (!intervalId) {
        return;
      }
      clearInterval(intervalId);
      intervalId = null;
    };

    const stop = async (): Promise<void> => {
      await stopNativeWatch();
      stopPolling();
      isWatching.value = false;
      snapshot.value = new Map();
      subscriptions.value = [];
    };

    const watch = (
      path: string,
      listener: FileWatcherListener,
      options: FileWatcherWatchOptions = {},
    ): (() => void) => {
      const subscription: PathSubscription = {
        path,
        listener,
        recursive: options.recursive ?? false,
      };

      subscriptions.value = [...subscriptions.value, subscription];

      return () => {
        subscriptions.value = subscriptions.value.filter((s) => s !== subscription);
      };
    };

    const store: FileWatcherStore = {
      isWatching,
      start,
      stop,
      watch,
    };

    return store;
  },
);
