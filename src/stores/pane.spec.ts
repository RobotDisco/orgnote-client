import { expect, test, vi } from 'vitest';
import { usePaneStore } from './pane';
import { createPinia, setActivePinia } from 'pinia';
import type { PanesSnapshot } from 'orgnote-api';

const mockRouter = {
  push: vi.fn(),
  currentRoute: {
    value: {
      path: '/',
      params: {},
      query: {},
      hash: '',
      name: 'InitialPage',
    },
  },
};

vi.mock('src/utils/pane-router', () => ({
  createPaneRouter: vi.fn(() => Promise.resolve(mockRouter)),
}));

test('should create unique tab titles', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  expect(firstPane.tabs.value[firstPane.activeTabId].title).toBe('Untitled');

  const secondTab = await paneStore.addTab();
  expect(secondTab?.title).toBe('Untitled 2');

  const thirdTab = await paneStore.addTab();
  expect(thirdTab?.title).toBe('Untitled 3');
});

test('should respect custom titles', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane({ title: 'Custom Title' });
  expect(firstPane.tabs.value[firstPane.activeTabId].title).toBe('Custom Title');

  const secondTab = await paneStore.addTab();
  expect(secondTab?.title).toBe('Untitled');

  const thirdTab = await paneStore.addTab();
  expect(thirdTab?.title).toBe('Untitled 2');
});

test('should switch to another tab when active tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  const paneId = pane.id;
  const firstTabId = pane.activeTabId;

  const secondTab = await paneStore.addTab();
  const secondTabId = secondTab!.id;

  paneStore.selectTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(secondTabId);

  paneStore.closeTab(paneId, secondTabId);

  // Должен переключиться на первый таб
  expect(paneStore.activeTab?.id).toBe(firstTabId);
  expect(paneStore.activeTab).toBeDefined();
});

test('should close inactive tab without changing active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  const paneId = pane.id;
  const firstTabId = pane.activeTabId;

  const secondTab = await paneStore.addTab();
  const secondTabId = secondTab!.id;

  expect(paneStore.activeTab?.id).toBe(firstTabId);

  paneStore.closeTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(firstTabId);
});

test('should not remove pane when closing last tab but reset route', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  const paneId = pane.id;
  const tabId = pane.activeTabId;

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);

  paneStore.closeTab(paneId, tabId);

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);
  expect(mockRouter.push).toHaveBeenCalledWith({ name: 'InitialPage', params: { paneId } });
});

test('should handle closing non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  const paneId = pane.id;
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab(paneId, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
  expect(paneStore.panes[paneId]).toBeDefined();
});

test('should handle closing tab from non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab('non-existent-pane-id', 'some-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
});

test('should create panes snapshot correctly', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane({ title: 'First Tab' });
  await paneStore.addTab({ title: 'Second Tab' });

  const snapshot = paneStore.getPanesSnapshot();

  expect(snapshot.activePaneId).toBe(firstPane.id);
  expect(snapshot.panes).toHaveLength(1);
  expect(snapshot.panes[0].id).toBe(firstPane.id);
  expect(snapshot.panes[0].tabs).toHaveLength(2);
  expect(snapshot.panes[0].tabs[0].title).toBe('First Tab');
  expect(snapshot.panes[0].tabs[1].title).toBe('Second Tab');
  expect(snapshot.timestamp).toBeTypeOf('number');
});

test('should restore panes from snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const originalPane = await paneStore.initNewPane({ title: 'Original Tab' });
  const secondTab = await paneStore.addTab({ title: 'Second Tab' });

  const snapshot = paneStore.getPanesSnapshot();

  paneStore.closeTab(originalPane.id, secondTab!.id);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  expect(Object.keys(paneStore.activePane!.tabs.value)).toHaveLength(1);

  await paneStore.restorePanesSnapshot(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  expect(paneStore.activePaneId).toBe(snapshot.activePaneId);

  const restoredPane = paneStore.activePane;
  expect(restoredPane?.tabs.value).toHaveProperty(snapshot.panes[0].tabs[0].id);
  expect(restoredPane?.tabs.value).toHaveProperty(snapshot.panes[0].tabs[1].id);
});

test('should create empty snapshot when no panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const snapshot = paneStore.getPanesSnapshot();

  expect(snapshot.panes).toHaveLength(0);
  expect(snapshot.activePaneId).toBe('');
  expect(snapshot.timestamp).toBeTypeOf('number');
});

test('should handle restoring empty snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  expect(Object.keys(paneStore.panes)).toHaveLength(1);

  const emptySnapshot: PanesSnapshot = {
    panes: [],
    activePaneId: '',
    timestamp: Date.now(),
  };

  await paneStore.restorePanesSnapshot(emptySnapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(0);
  expect(paneStore.activePaneId).toBe('');
});

test('should handle selectTab with non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab('non-existent-pane', 'some-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should handle selectTab with non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab(pane.id, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should handle navigate when no active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result = paneStore.navigate({ path: '/some-path' });

  expect(result).toBeUndefined();
});

test('should handle navigateTab with non-existent pane or tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result1 = paneStore.navigateTab('non-existent-pane', 'some-tab', { path: '/path' });
  expect(result1).toBeUndefined();

  const pane = await paneStore.initNewPane();
  const result2 = paneStore.navigateTab(pane.id, 'non-existent-tab', { path: '/path' });
  expect(result2).toBeUndefined();
});
