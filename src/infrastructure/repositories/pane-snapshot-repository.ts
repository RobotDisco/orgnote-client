import type Dexie from 'dexie';
import type { PaneSnapshotRepository, PanesSnapshot, StoredPaneSnapshot } from 'orgnote-api';
import { migrator } from './migrator';
import { v4 } from 'uuid';

export const PANE_SNAPSHOT_REPOSITORY_NAME = 'paneSnapshots';
export const PANE_SNAPSHOT_MIGRATIONS = migrator<StoredPaneSnapshot>()
  .v(1)
  .indexes('&id,createdAt')
  .build();

export const createPaneSnapshotRepository = (db: Dexie): PaneSnapshotRepository => {
  const store = db.table<StoredPaneSnapshot, string>(PANE_SNAPSHOT_REPOSITORY_NAME);

  const list = async (limit?: number): Promise<StoredPaneSnapshot[]> => {
    const collection = store.orderBy('createdAt').reverse();
    if (!limit || limit <= 0) return collection.toArray();
    return collection.limit(limit).toArray();
  };

  const save = async (snapshot: PanesSnapshot): Promise<void> => {
    const record: StoredPaneSnapshot = {
      id: v4(),
      createdAt: new Date().toISOString(),
      snapshot,
    };
    await store.put(record);
  };

  const getLatest = async (): Promise<StoredPaneSnapshot | null> => {
    const snapshots = await list(1);
    const [latest] = snapshots;
    if (!latest) return null;
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
