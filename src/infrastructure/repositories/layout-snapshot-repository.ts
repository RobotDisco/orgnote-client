import type Dexie from 'dexie';
import { migrator } from './migrator';
import { v4 } from 'uuid';
import type { LayoutSnapshot, LayoutSnapshotRepository, StoredLayoutSnapshot } from 'orgnote-api';

export const PANE_SNAPSHOT_REPOSITORY_NAME = 'paneSnapshots';
export const PANE_SNAPSHOT_MIGRATIONS = migrator<StoredLayoutSnapshot>()
  .v(1)
  .indexes('&id,createdAt')
  .build();

export const createLayoutSnapshotRepository = (db: Dexie): LayoutSnapshotRepository => {
  const store = db.table<StoredLayoutSnapshot, string>(PANE_SNAPSHOT_REPOSITORY_NAME);

  const list = async (limit?: number): Promise<StoredLayoutSnapshot[]> => {
    const collection = store.orderBy('createdAt').reverse();
    if (!limit || limit <= 0) return collection.toArray();
    return collection.limit(limit).toArray();
  };

  const save = async (snapshot: LayoutSnapshot): Promise<void> => {
    const record: StoredLayoutSnapshot = {
      id: v4(),
      createdAt: new Date().toISOString(),
      snapshot,
    };
    await store.put(record);
  };

  const getLatest = async (): Promise<StoredLayoutSnapshot | undefined> => {
    const snapshots = await list(1);
    const [latest] = snapshots;
    if (!latest) return;
    return latest;
  };

  const remove = async (id: string): Promise<void> => {
    await store.delete(id);
  };

  const clear = async (): Promise<void> => {
    await store.clear();
  };

  return {
    save,
    getLatest,
    list,
    delete: remove,
    clear,
  };
};
