import { RouteNames } from 'orgnote-api';
import { createPaneRouter } from './pane-router';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Router, RouteLocationNormalized } from 'vue-router';

// Mock the page imports
vi.mock('src/pages/InitialPage.vue', () => ({
  default: { name: 'InitialPage' },
}));

vi.mock('src/pages/EditNote.vue', () => ({
  default: { name: 'EditNote' },
}));

vi.mock('src/pages/AppBuffer.vue', () => ({
  default: { name: 'AppBuffer' },
}));

let router: Router;
const testTabId = 'test-tab-123';

beforeEach(async () => {
  router = await createPaneRouter(testTabId);
});

test('creates router with memory history', () => {
  expect(router).toBeDefined();
  expect(router.options.history.location).toBeDefined();
});

test('initializes with correct initial route', () => {
  expect(router.currentRoute.value.name).toBe(RouteNames.InitialPage);
  expect(router.currentRoute.value.params.paneId).toBe(testTabId);
});

test('has initial page route configured', () => {
  const initialPageRoute = router
    .getRoutes()
    .find((route) => route.name === RouteNames.InitialPage);

  expect(initialPageRoute).toBeDefined();
  expect(initialPageRoute?.path).toBe('/:paneId');
  expect(initialPageRoute?.meta?.titleGenerator).toBeDefined();
});

test('has edit note route configured', () => {
  const editNoteRoute = router.getRoutes().find((route) => route.name === RouteNames.EditNote);

  expect(editNoteRoute).toBeDefined();
  expect(editNoteRoute?.path).toBe('/:paneId/edit-note/:path(.*)');
  expect(editNoteRoute?.meta?.titleGenerator).toBeDefined();
});

test('initial page title generator returns null', () => {
  const initialPageRoute = router
    .getRoutes()
    .find((route) => route.name === RouteNames.InitialPage);
  const titleGenerator = initialPageRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: {},
    query: {},
    hash: '',
    fullPath: '/test',
    path: '/test',
    name: RouteNames.InitialPage,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  expect(titleGenerator(mockRoute)).toBe(null);
});

test('edit note title generator extracts filename from path', () => {
  const editNoteRoute = router.getRoutes().find((route) => route.name === RouteNames.EditNote);
  const titleGenerator = editNoteRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: 'folder/subfolder/test-file.org' },
    query: {},
    hash: '',
    fullPath: '/test/edit-note/folder/subfolder/test-file.org',
    path: '/test/edit-note/folder/subfolder/test-file.org',
    name: RouteNames.EditNote,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  expect(titleGenerator(mockRoute)).toBe('test-file.org');
});

test('edit note title generator returns default title for empty path', () => {
  const editNoteRoute = router.getRoutes().find((route) => route.name === RouteNames.EditNote);
  const titleGenerator = editNoteRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: '' },
    query: {},
    hash: '',
    fullPath: '/test/edit-note/',
    path: '/test/edit-note/',
    name: RouteNames.EditNote,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  expect(titleGenerator(mockRoute)).toBe(null);
});

test('edit note title generator returns default title for path without filename', () => {
  const editNoteRoute = router.getRoutes().find((route) => route.name === RouteNames.EditNote);
  const titleGenerator = editNoteRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const mockRoute = {
    params: { path: 'folder/' },
    query: {},
    hash: '',
    fullPath: '/test/edit-note/folder/',
    path: '/test/edit-note/folder/',
    name: RouteNames.EditNote,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  expect(titleGenerator(mockRoute)).toBe('Untitled');
});

test('can navigate to edit note route', async () => {
  const testPath = 'test/file.org';

  await router.push({
    name: RouteNames.EditNote,
    params: {
      paneId: testTabId,
      path: testPath,
    },
  });

  expect(router.currentRoute.value.name).toBe(RouteNames.EditNote);
  expect(router.currentRoute.value.params.paneId).toBe(testTabId);
  expect(router.currentRoute.value.params.path).toBe(testPath);
});

test('can navigate back to initial page', async () => {
  await router.push({
    name: RouteNames.EditNote,
    params: {
      paneId: testTabId,
      path: 'test.org',
    },
  });

  await router.push({
    name: RouteNames.InitialPage,
    params: {
      paneId: testTabId,
    },
  });

  expect(router.currentRoute.value.name).toBe(RouteNames.InitialPage);
  expect(router.currentRoute.value.params.paneId).toBe(testTabId);
});

test('handles complex file paths correctly', () => {
  const editNoteRoute = router.getRoutes().find((route) => route.name === RouteNames.EditNote);
  const titleGenerator = editNoteRoute?.meta?.titleGenerator;

  expect(titleGenerator).toBeDefined();

  const complexPathRoute = {
    params: { path: 'documents/projects/2024/notes/meeting-notes.org' },
    query: {},
    hash: '',
    fullPath: '/test/edit-note/documents/projects/2024/notes/meeting-notes.org',
    path: '/test/edit-note/documents/projects/2024/notes/meeting-notes.org',
    name: RouteNames.EditNote,
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;

  expect(titleGenerator(complexPathRoute)).toBe('meeting-notes.org');
});
