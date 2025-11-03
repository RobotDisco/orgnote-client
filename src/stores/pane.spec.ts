import { expect, test, vi } from 'vitest';
import { usePaneStore } from './pane';
import { createPinia, setActivePinia } from 'pinia';
import type { PaneSnapshot } from 'orgnote-api';

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

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneRef = paneStore.getPane(pane.id);
  expect(paneRef.value.tabs.value[paneRef.value.activeTabId].title).toBe('Untitled');

  const secondTab = await paneStore.addTab(pane.id);
  expect(secondTab?.title).toBe('Untitled 2');

  const thirdTab = await paneStore.addTab(pane.id);
  expect(thirdTab?.title).toBe('Untitled 3');
});

test('should respect custom titles', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Custom Title' });
  const paneRef = paneStore.getPane(pane.id);
  expect(paneRef.value.tabs.value[paneRef.value.activeTabId].title).toBe('Custom Title');

  const secondTab = await paneStore.addTab(pane.id);
  expect(secondTab?.title).toBe('Untitled');

  const thirdTab = await paneStore.addTab(pane.id);
  expect(thirdTab?.title).toBe('Untitled 2');
});

test('should switch to another tab when active tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneRef = paneStore.getPane(paneId);
  const firstTabId = paneRef.value.activeTabId;

  const secondTab = await paneStore.addTab(paneId);
  const secondTabId = secondTab!.id;

  paneStore.selectTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(secondTabId);

  paneStore.closeTab(paneId, secondTabId);

  expect(paneStore.activeTab?.id).toBe(firstTabId);
  expect(paneStore.activeTab).toBeDefined();
});

test('should close inactive tab without changing active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneRef = paneStore.getPane(paneId);
  const firstTabId = paneRef.value.activeTabId;

  const secondTab = await paneStore.addTab(paneId);
  const secondTabId = secondTab!.id;

  paneStore.selectTab(paneId, firstTabId);
  expect(paneStore.activeTab?.id).toBe(firstTabId);

  paneStore.closeTab(paneId, secondTabId);
  expect(paneStore.activeTab?.id).toBe(firstTabId);
});

test('should not remove pane when closing last tab but reset route', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const paneRef = paneStore.getPane(paneId);
  const tabId = paneRef.value.activeTabId;

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

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneId = pane.id;
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab(paneId, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
  expect(paneStore.panes[paneId]).toBeDefined();
});

test('should handle closing tab from non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const activeTabBefore = paneStore.activeTab;

  paneStore.closeTab('non-existent-pane-id', 'some-tab-id');

  expect(paneStore.activeTab).toBe(activeTabBefore);
});

test('should create panes snapshot correctly', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'First Tab' });
  await paneStore.addTab(pane.id, { title: 'Second Tab' });

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(1);
  expect(snapshot[0].id).toBe(pane.id);
  expect(snapshot[0].tabs).toHaveLength(2);
  expect(snapshot[0].tabs[0].title).toBe('First Tab');
  expect(snapshot[0].tabs[1].title).toBe('Second Tab');
});

test('should restore panes from snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const originalPane = await paneStore.createPane();
  await paneStore.addTab(originalPane.id, { title: 'Original Tab' });
  const secondTab = await paneStore.addTab(originalPane.id, { title: 'Second Tab' });

  const snapshot = paneStore.getPanesData();

  paneStore.closeTab(originalPane.id, secondTab!.id);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  const paneRef = paneStore.getPane(originalPane.id);
  expect(Object.keys(paneRef.value.tabs.value)).toHaveLength(1);

  await paneStore.restorePanesData(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  expect(paneStore.activePaneId).toBe(snapshot[0].id);

  const restoredPaneRef = paneStore.getPane(snapshot[0].id);
  expect(restoredPaneRef.value.tabs.value).toHaveProperty(snapshot[0].tabs[0].id);
  expect(restoredPaneRef.value.tabs.value).toHaveProperty(snapshot[0].tabs[1].id);
});

test('should create empty snapshot when no panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const snapshot = paneStore.getPanesData();

  expect(snapshot).toHaveLength(0);
});

test('should handle restoring empty snapshot', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);

  const emptySnapshot: PaneSnapshot[] = [];

  await paneStore.restorePanesData(emptySnapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(0);
  expect(paneStore.activePaneId).toBeNull();
});

test('should handle selectTab with non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab('non-existent-pane', 'some-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should handle selectTab with non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const originalActiveTab = paneStore.activeTab;

  paneStore.selectTab(pane.id, 'non-existent-tab-id');

  expect(paneStore.activeTab).toBe(originalActiveTab);
});

test('should set active pane when selecting tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id);

  expect(paneStore.activePaneId).toBe(pane2.id);

  paneStore.selectTab(pane1.id, tab1!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane.id).toBe(pane1.id);
  expect(paneStore.activeTab.id).toBe(tab1!.id);
});

test('should throw error when navigate without active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await expect(paneStore.navigate({ path: '/some-path' })).rejects.toThrow('No active pane');
});

test('should throw error when navigate to non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await expect(paneStore.navigate({ path: '/path' }, 'non-existent-pane')).rejects.toThrow(
    'Pane non-existent-pane not found',
  );
});

test('should throw error when navigate to non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await expect(paneStore.navigate({ path: '/path' }, pane.id, 'non-existent-tab')).rejects.toThrow(
    'Tab non-existent-tab not found or has no router',
  );
});

test('closeTab should remove empty pane when other panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id, { title: 'First Pane' });
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id, { title: 'Second Pane' });
  const secondPaneId = secondPane.id;
  const secondPaneRef = paneStore.getPane(secondPaneId);
  const secondTabId = secondPaneRef.value.activeTabId;

  expect(Object.keys(paneStore.panes)).toHaveLength(2);
  expect(paneStore.activePaneId).toBe(secondPaneId);

  paneStore.closeTab(secondPaneId, secondTabId);

  expect(paneStore.panes[secondPaneId]).toBeUndefined();
  expect(paneStore.panes[firstPaneId]).toBeDefined();
  expect(paneStore.activePaneId).not.toBe(secondPaneId);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
});

test('closeTab should keep last pane and show InitialPage when its only tab is closed', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Only Pane' });
  const paneId = pane.id;
  const paneRef = paneStore.getPane(paneId);
  const tabId = paneRef.value.activeTabId;

  expect(Object.keys(paneStore.panes)).toHaveLength(1);

  paneStore.closeTab(paneId, tabId);

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.activePaneId).toBe(paneId);
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  expect(mockRouter.push).toHaveBeenCalledWith({ name: 'InitialPage', params: { paneId } });
});

test('cleanupEmptyPane should be reachable and remove pane correctly', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id);
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id);
  const secondPaneId = secondPane.id;
  const secondPaneRef = paneStore.getPane(secondPaneId);
  const secondTabId = secondPaneRef.value.activeTabId;

  const thirdTab = await paneStore.addTab(secondPaneId, { title: 'Third tab' });
  expect(Object.keys(paneStore.getPane(secondPaneId).value.tabs.value)).toHaveLength(2);

  paneStore.closeTab(secondPaneId, secondTabId);
  expect(Object.keys(paneStore.getPane(secondPaneId).value.tabs.value)).toHaveLength(1);

  paneStore.closeTab(secondPaneId, thirdTab!.id);

  expect(paneStore.panes[secondPaneId]).toBeUndefined();
  expect(paneStore.panes[firstPaneId]).toBeDefined();
});

test('createPane should create a new pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();

  expect(pane.id).toBeDefined();
  expect(paneStore.panes[pane.id]).toBeDefined();
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('deletePane should remove pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  expect(paneStore.panes[pane.id]).toBeDefined();

  paneStore.closePane(pane.id);

  expect(paneStore.panes[pane.id]).toBeUndefined();
});

test('closePane should remove pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  expect(paneStore.panes[pane.id]).toBeDefined();

  paneStore.closePane(pane.id);

  expect(paneStore.panes[pane.id]).toBeUndefined();
});

test('setActivePane should set active pane ID', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.createPane();
  await paneStore.addTab(firstPane.id);
  const secondPane = await paneStore.createPane();
  await paneStore.addTab(secondPane.id);

  expect(paneStore.activePaneId).toBe(secondPane.id);

  paneStore.setActivePane(firstPane.id);

  expect(paneStore.activePaneId).toBe(firstPane.id);
});

test('getPane should return pane ref', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  const paneRef = paneStore.getPane(pane.id);

  expect(paneRef.value.id).toBe(pane.id);
});

test('getPane should throw error for non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(() => {
    paneStore.getPane('non-existent-id');
  }).toThrow();
});

test('activePane should return active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  expect(paneStore.activePane.id).toBe(pane.id);
});

test('activeTab should return active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id, { title: 'Test Tab' });

  expect(paneStore.activeTab.title).toBe('Test Tab');
});

test('startDraggingTab should set dragging state', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneRef = paneStore.getPane(pane.id);
  const tabId = paneRef.value.activeTabId;

  paneStore.startDraggingTab(tabId, pane.id);

  expect(paneStore.isDraggingTab).toBe(true);
  expect(paneStore.draggedTabData).toEqual({ tabId, paneId: pane.id });
});

test('stopDraggingTab should clear dragging state', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  const paneRef = paneStore.getPane(pane.id);
  const tabId = paneRef.value.activeTabId;

  paneStore.startDraggingTab(tabId, pane.id);
  paneStore.stopDraggingTab();

  expect(paneStore.isDraggingTab).toBe(false);
  expect(paneStore.draggedTabData).toBeNull();
});

test('should move tab between panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 1.5' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const movedTab = await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(movedTab).toBeTruthy();
  expect(movedTab?.paneId).toBe(pane2.id);
  expect(paneStore.getPane(pane2.id).value.tabs.value[tab1!.id]).toBeDefined();
});

test('should move tab to specific index', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id, 1);

  const tabKeys = Object.keys(paneStore.getPane(pane2.id).value.tabs.value);
  expect(tabKeys[1]).toBe(tab1!.id);
});

test('should activate moved tab in target pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.getPane(pane2.id).value.activeTabId).toBe(tab1!.id);
  expect(paneStore.activePaneId).toBe(pane2.id);
});

test('should remove tab from source pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 1.5' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.getPane(pane1.id).value.tabs.value[tab1!.id]).toBeUndefined();
});

test('should handle moving last tab from pane with multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.panes[pane1.id]).toBeUndefined();
});

test('should remove source pane when empty and multiple panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.panes[pane1.id]).toBeUndefined();
});

test('should activate moved tab when it was active', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  paneStore.selectTab(pane1.id, tab1!.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(paneStore.activePaneId).toBe(pane2.id);
  expect(paneStore.getPane(pane2.id).value.activeTabId).toBe(tab1!.id);
});

test('should activate first tab in source pane after move', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  const tab2 = await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  paneStore.selectTab(pane1.id, tab2!.id);

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 3' });

  await paneStore.moveTab(tab2!.id, pane1.id, pane2.id);

  expect(paneStore.getPane(pane1.id).value.activeTabId).toBe(tab1!.id);
});

test('should return moved tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab(tab1!.id, pane1.id, pane2.id);

  expect(result).toBeTruthy();
  expect(result?.id).toBe(tab1!.id);
  expect(result?.paneId).toBe(pane2.id);
});

test('should return undefined when tab not found', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id, { title: 'Tab 1' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab('non-existent-id', pane1.id, pane2.id);

  expect(result).toBeUndefined();
});

test('should return undefined when panes not found', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result = await paneStore.moveTab('tab-id', 'non-existent-pane-1', 'non-existent-pane-2');

  expect(result).toBeUndefined();
});

test('should handle moving to same pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Tab 1' });
  await paneStore.addTab(pane1.id, { title: 'Tab 2' });

  const result = await paneStore.moveTab(tab1!.id, pane1.id, pane1.id);

  expect(result).toBeTruthy();
  expect(paneStore.getPane(pane1.id).value.tabs.value[tab1!.id]).toBeDefined();
});

test('navigate should call router push on active tab in active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } });

  expect(mockRouter.push).toHaveBeenLastCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', paneId: pane.id },
  });
});

test('navigate should call router push on specific pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } }, pane.id);

  expect(mockRouter.push).toHaveBeenLastCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', paneId: pane.id },
  });
});

test('navigate should handle string route params', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);

  await paneStore.navigate('/test-path');

  expect(mockRouter.push).toHaveBeenLastCalledWith({ path: '/test-path' });
});

test('navigate should throw when pane has no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await expect(paneStore.navigate({ path: '/test-path' })).rejects.toThrow();
});

test('navigate should call router push on specific tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate({ name: 'EditNote', params: { path: 'test.org' } }, pane.id, tab!.id);

  expect(mockRouter.push).toHaveBeenCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', paneId: pane.id },
  });
});

test('navigate should handle string route with specific tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  vi.clearAllMocks();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate('/edit-note/test.org', pane.id, tab!.id);

  expect(mockRouter.push).toHaveBeenLastCalledWith({
    path: '/edit-note/test.org',
  });
});

test('navigate should preserve existing params', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  const tab = await paneStore.addTab(pane.id);

  await paneStore.navigate(
    {
      name: 'EditNote',
      params: { path: 'test.org', customParam: 'value' },
    },
    pane.id,
    tab!.id,
  );

  expect(mockRouter.push).toHaveBeenCalledWith({
    name: 'EditNote',
    params: { path: 'test.org', customParam: 'value', paneId: pane.id },
  });
});

test('addTab should return undefined when pane does not exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const result = await paneStore.addTab('non-existent-pane-id');

  expect(result).toBeUndefined();
});

test('setActivePane should throw error for non-existent pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(() => {
    paneStore.setActivePane('non-existent-pane-id');
  }).toThrow();
});

test('activePane should return undefined when no active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  expect(paneStore.activePane).toBeUndefined();
});

test('activeTab should return undefined when no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.createPane();

  expect(paneStore.activeTab).toBeUndefined();
});

test('closeTab should not affect other panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(paneStore.getPane(pane1.id).value.tabs.value[tab1!.id]).toBeDefined();
  expect(paneStore.getPane(pane1.id).value.tabs.value[tab1!.id].title).toBe('Pane 1 Tab');
});

test('should handle multiple tabs with same title pattern', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  await paneStore.addTab(pane.id);
  await paneStore.addTab(pane.id);
  const tab4 = await paneStore.addTab(pane.id);

  expect(tab4?.title).toBe('Untitled 4');
});

test('restorePanesData should restore multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  const snapshot = paneStore.getPanesData();

  paneStore.closePane(pane1.id);
  paneStore.closePane(pane2.id);

  await paneStore.restorePanesData(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(2);
  expect(paneStore.panes[pane1.id]).toBeDefined();
  expect(paneStore.panes[pane2.id]).toBeDefined();
});

test('should activate remaining pane when closing last tab in active pane with multiple panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  paneStore.setActivePane(pane2.id);
  expect(paneStore.activePaneId).toBe(pane2.id);

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane).toBeDefined();
  expect(paneStore.activePane?.activeTabId).toBeTruthy();
  expect(paneStore.activeTab).toBeDefined();
  expect(paneStore.activeTab?.id).toBe(tab1!.id);
});

test('BUG: should activate tab in remaining pane when it has no active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane1 = await paneStore.createPane();
  const tab1 = await paneStore.addTab(pane1.id, { title: 'Pane 1 Tab' });

  const pane2 = await paneStore.createPane();
  const tab2 = await paneStore.addTab(pane2.id, { title: 'Pane 2 Tab' });

  paneStore.panes[pane1.id].value = {
    ...paneStore.panes[pane1.id].value,
    activeTabId: '',
  };

  paneStore.setActivePane(pane2.id);

  paneStore.closeTab(pane2.id, tab2!.id);

  expect(paneStore.activePaneId).toBe(pane1.id);
  expect(paneStore.activePane?.activeTabId).toBe(tab1!.id);
  expect(paneStore.activeTab).toBeDefined();
  expect(paneStore.activeTab?.id).toBe(tab1!.id);
});
