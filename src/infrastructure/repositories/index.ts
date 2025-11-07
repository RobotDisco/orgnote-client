import type { OrgNoteApi } from 'orgnote-api';
import { createDatabase } from './create-database';
import { NOTE_REPOSITORY_NAME, NOTE_MIGRATIONS } from './note-info-repository';
import { FILE_REPOSITORY_NAME, FILE_MIGRATIONS } from './file-repository';
import { createFileRepository } from './file-repository';
import { createNoteInfoRepository } from './note-info-repository';
import {
  createLoggerRepository,
  LOGGER_MIGRATIONS,
  LOGGER_REPOSITORY_NAME,
} from './logger-repository';
import {
  createLayoutSnapshotRepository,
  PANE_SNAPSHOT_MIGRATIONS,
  PANE_SNAPSHOT_REPOSITORY_NAME,
} from './layout-snapshot-repository';
import type Dexie from 'dexie';

let database: Dexie | undefined;

export const getDatabase = (): Dexie | undefined => database;

export async function initRepositories(): Promise<OrgNoteApi['infrastructure']> {
  const { db } = createDatabase([
    { storeName: NOTE_REPOSITORY_NAME, migrations: NOTE_MIGRATIONS },
    { storeName: FILE_REPOSITORY_NAME, migrations: FILE_MIGRATIONS },
    { storeName: LOGGER_REPOSITORY_NAME, migrations: LOGGER_MIGRATIONS },
    { storeName: PANE_SNAPSHOT_REPOSITORY_NAME, migrations: PANE_SNAPSHOT_MIGRATIONS },
  ]);
  database = db;
  return {
    fileInfoRepository: createFileRepository(db),
    noteInfoRepository: createNoteInfoRepository(db),
    logRepository: createLoggerRepository(db),
    layoutSnapshotRepository: createLayoutSnapshotRepository(db),
  };
}
