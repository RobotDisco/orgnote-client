import 'fake-indexeddb/auto';
import { createNoteInfoRepository, NOTE_MIGRATIONS } from './note-info-repository';
import type Dexie from 'dexie';
import { expect, test, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import type { NoteInfo } from 'orgnote-api';
import { createDatabase } from './create-database';

const createMockNote = (): NoteInfo => ({
  id: faker.string.uuid(),
  meta: {
    title: faker.lorem.words(3),
    description: faker.lorem.sentences(2),
    fileTags: Array.from({ length: 3 }, () => faker.lorem.word()),
  },
  filePath: [faker.system.filePath()],
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  touchedAt: faker.date.recent().toISOString(),
  bookmarked: faker.datatype.boolean(),
  encrypted: faker.datatype.boolean(),
  deletedAt: undefined,
});

let db: Dexie;
let dropAll: () => Promise<void>;
let repository: ReturnType<typeof createNoteInfoRepository>;

beforeEach(() => {
  const databaseSettings = createDatabase([{ storeName: 'notes', migrations: NOTE_MIGRATIONS }]);
  db = databaseSettings.db;
  dropAll = databaseSettings.dropAll;
  repository = createNoteInfoRepository(db);
});

afterEach(async () => {
  await dropAll();
});

test('should save and retrieve a note by ID', async () => {
  const note = createMockNote();
  await repository.putNote(note);

  const noteId = note.id;
  if (!noteId) throw new Error('note.id is undefined');
  const result = await repository.getById(noteId);
  expect(result).toEqual(note);
});

test('should retrieve notes after a specific update time', async () => {
  const recentNote = { ...createMockNote(), updatedAt: new Date().toISOString() };
  const oldNote = { ...createMockNote(), updatedAt: new Date(Date.now() - 100000).toISOString() };
  await repository.saveNotes([recentNote, oldNote]);

  const results = await repository.getNotesAfterUpdateTime(
    new Date(Date.now() - 50000).toISOString(),
  );
  expect(results).toEqual([recentNote]);
});

test('should mark notes as deleted', async () => {
  const note = createMockNote();
  await repository.putNote(note);
  const noteId = note.id;
  if (!noteId) throw new Error('note.id is undefined');
  await repository.markAsDeleted([noteId]);

  const deletedNotes = await repository.getDeletedNotes();
  expect(deletedNotes).toHaveLength(1);
  const deletedNote = deletedNotes[0];
  if (!deletedNote) throw new Error('deletedNote is undefined');
  expect(deletedNote.id).toBe(noteId);
});

test('should retrieve notes with specific tags', async () => {
  const noteWithTag = {
    ...createMockNote(),
    meta: { ...createMockNote().meta, fileTags: ['tag1'] },
  };
  const noteWithoutTag = {
    ...createMockNote(),
    meta: { ...createMockNote().meta, fileTags: ['tag2'] },
  };
  await repository.saveNotes([noteWithTag, noteWithoutTag]);

  const results = await repository.getNotesInfo({ tags: ['tag1'] });
  expect(results).toHaveLength(1);
  const result = results[0];
  if (!result) throw new Error('result is undefined');
  expect(result.meta.fileTags).toContain('tag1');
});

test('should add and remove a bookmark', async () => {
  const note = createMockNote();
  await repository.putNote(note);

  const noteId = note.id;
  if (!noteId) throw new Error('note.id is undefined');
  await repository.addBookmark(noteId);
  const bookmarkedNote = await repository.getById(noteId);
  if (!bookmarkedNote) throw new Error('bookmarkedNote is undefined');
  expect(bookmarkedNote.bookmarked).toBe(true);

  await repository.deleteBookmark(noteId);
  const unbookmarkedNote = await repository.getById(noteId);
  if (!unbookmarkedNote) throw new Error('unbookmarkedNote is undefined');
  expect(unbookmarkedNote.bookmarked).toBe(false);
});

test('should count notes with search criteria', async () => {
  const note = {
    ...createMockNote(),
    meta: { ...createMockNote().meta, title: 'searchable title' },
  };
  await repository.putNote(note);

  const count = await repository.count('searchable');
  expect(count).toBe(1);
});

test('should retrieve file paths', async () => {
  const note = createMockNote();
  await repository.putNote(note);

  const filePaths = await repository.getFilePaths();
  expect(filePaths).toHaveLength(1);
  expect(filePaths[0]?.filePath).toEqual(note.filePath);
});

test('should clear all notes', async () => {
  const notes = Array.from({ length: 5 }, createMockNote);
  await repository.saveNotes(notes);

  await repository.clear();
  const allNotes = await repository.getNotesAfterUpdateTime();
  expect(allNotes).toHaveLength(0);
});

test('should modify notes based on callback', async () => {
  const note = createMockNote();
  await repository.putNote(note);

  await repository.modify((n: NoteInfo) => {
    n.meta.title = 'Modified title';
  });

  const noteId = note.id;
  if (!noteId) throw new Error('note.id is undefined');
  const modifiedNote = await repository.getById(noteId);
  if (!modifiedNote) throw new Error('modifiedNote is undefined');
  expect(modifiedNote.meta.title).toBe('Modified title');
});

test('should retrieve IDs of notes based on filter callback', async () => {
  const notes = Array.from({ length: 3 }, createMockNote);
  await repository.saveNotes(notes);

  const firstNote = notes[0];
  if (!firstNote) throw new Error('firstNote is undefined');
  const fileTags = firstNote.meta.fileTags;
  if (!fileTags) throw new Error('firstNote.meta.fileTags is undefined');
  const firstTag = fileTags[0];
  if (!firstTag) throw new Error('firstTag is undefined');
  const ids = await repository.getIds((n: NoteInfo) => n.meta.fileTags?.includes(firstTag) ?? false);
  expect(ids).toContain(firstNote.id);
});

test('should not modify non-existing note', async () => {
  const nonExistentId = faker.string.uuid();

  await repository.modify((n: NoteInfo) => {
    if (n.id === nonExistentId) {
      n.meta.title = 'Non-existent';
    }
  });

  const result = await repository.getById(nonExistentId);
  expect(result).toBeUndefined();
});

test('should not double delete already deleted notes', async () => {
  const note = createMockNote();
  await repository.putNote(note);
  const noteId = note.id;
  if (!noteId) throw new Error('note.id is undefined');
  await repository.markAsDeleted([noteId]);

  await repository.markAsDeleted([noteId]);
  const deletedNotes = await repository.getDeletedNotes();

  expect(deletedNotes).toHaveLength(1);
  const deletedNote = deletedNotes[0];
  if (!deletedNote) throw new Error('deletedNote is undefined');
  expect(deletedNote.id).toBe(noteId);
});

test('should handle empty updates in bulkPartialUpdate', async () => {
  await repository.bulkPartialUpdate([]);
  const allNotes = await repository.getNotesAfterUpdateTime();
  expect(allNotes).toHaveLength(0);
});

test('should return undefined for non-existing ID', async () => {
  const nonExistentId = faker.string.uuid();
  const result = await repository.getById(nonExistentId);
  expect(result).toBeUndefined();
});

test('should handle large number of notes', async () => {
  const notes = Array.from({ length: 1000 }, createMockNote);
  await repository.saveNotes(notes);

  const count = await repository.count();
  expect(count).toBe(1000);
});

test('should clear and re-add notes successfully', async () => {
  const notes = Array.from({ length: 5 }, createMockNote);
  await repository.saveNotes(notes);

  await repository.clear();
  await repository.saveNotes(notes);

  const allNotes = await repository.getNotesAfterUpdateTime();
  expect(allNotes).toHaveLength(5);
});
