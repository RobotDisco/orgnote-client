import { expect, test, vi } from 'vitest';
import { usePaneStore } from './pane';
import { createPinia, setActivePinia } from 'pinia';
import type { LayoutNode, PanesSnapshot } from 'orgnote-api';

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
  expect(paneStore.activePaneId).toBeNull();
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

test('closeTab should remove empty pane when other panes exist', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane({ title: 'First Pane' });
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.initNewPane({ title: 'Second Pane' });
  const secondPaneId = secondPane.id;
  const secondTabId = secondPane.activeTabId;

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

  const pane = await paneStore.initNewPane({ title: 'Only Pane' });
  const paneId = pane.id;
  const tabId = pane.activeTabId;

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

  const firstPane = await paneStore.initNewPane();
  const firstPaneId = firstPane.id;

  const secondPane = await paneStore.initNewPane();
  const secondPaneId = secondPane.id;
  const secondTabId = secondPane.activeTabId;

  const thirdTab = await paneStore.addTab({ title: 'Third tab' });
  expect(Object.keys(paneStore.panes[secondPaneId].value.tabs.value)).toHaveLength(2);

  paneStore.closeTab(secondPaneId, secondTabId);
  expect(Object.keys(paneStore.panes[secondPaneId].value.tabs.value)).toHaveLength(1);

  paneStore.closeTab(secondPaneId, thirdTab!.id);

  expect(paneStore.panes[secondPaneId]).toBeUndefined();
  expect(paneStore.panes[firstPaneId]).toBeDefined();
});

test('initLayout should create initial pane layout node', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  paneStore.initLayout();

  expect(paneStore.layout).toBeDefined();
  expect(paneStore.layout.type).toBe('pane');
  expect(paneStore.layout.id).toBeDefined();

  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).toBe(pane.id);
  }
});

test('initLayout should use existing active pane if available', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  const secondPane = await paneStore.initNewPane();

  paneStore.initLayout();

  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).toBe(secondPane.id);
  }
});

test('findPaneInLayout should find pane node by paneId', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  paneStore.initLayout();

  const found = paneStore.findPaneInLayout(pane.id);

  expect(found).toBeDefined();
  expect(found?.type).toBe('pane');
  if (found?.type === 'pane') {
    expect(found.paneId).toBe(pane.id);
  }
});

test('findPaneInLayout should return null for non-existent paneId', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const found = paneStore.findPaneInLayout('non-existent-id');

  expect(found).toBeNull();
});

test('findPaneInLayout should search recursively in split nodes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');

  const splitLayout = paneStore.layout;
  const newPaneId =
    splitLayout.type === 'split' && splitLayout.children[1].type === 'pane'
      ? splitLayout.children[1].paneId
      : '';

  const found = paneStore.findPaneInLayout(newPaneId);

  expect(found).toBeDefined();
  expect(found?.type).toBe('pane');
  if (found?.type === 'pane') {
    expect(found.paneId).toBe(newPaneId);
  }
});

test('splitPaneInLayout should split pane to the left', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const rootNode = paneStore.layout;
  const rootPaneId = rootNode.type === 'pane' ? rootNode.paneId : '';

  await paneStore.splitPaneInLayout(rootPaneId, 'left');

  const newLayout = paneStore.layout;

  expect(newLayout.type).toBe('split');
  if (newLayout.type === 'split') {
    expect(newLayout.orientation).toBe('horizontal');
    expect(newLayout.children).toHaveLength(2);
  }
});

test('splitPaneInLayout should split pane to the right', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');

  expect(paneStore.layout.type).toBe('split');
  if (paneStore.layout.type === 'split') {
    expect(paneStore.layout.orientation).toBe('horizontal');
    expect(paneStore.layout.children).toHaveLength(2);
    if (paneStore.layout.children[0].type === 'pane') {
      expect(paneStore.layout.children[0].paneId).toBe(firstPane.id);
    }
    if (paneStore.layout.children[1].type === 'pane') {
      const newPaneId = paneStore.layout.children[1].paneId;
      expect(paneStore.panes[newPaneId]).toBeDefined();
    }
  }
});

test('splitPaneInLayout should split pane to the top', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'top');

  expect(paneStore.layout.type).toBe('split');
  if (paneStore.layout.type === 'split') {
    expect(paneStore.layout.orientation).toBe('vertical');
    expect(paneStore.layout.children).toHaveLength(2);
    if (paneStore.layout.children[0].type === 'pane') {
      const newPaneId = paneStore.layout.children[0].paneId;
      expect(paneStore.panes[newPaneId]).toBeDefined();
    }
    if (paneStore.layout.children[1].type === 'pane') {
      expect(paneStore.layout.children[1].paneId).toBe(firstPane.id);
    }
  }
});

test('splitPaneInLayout should split pane to the bottom', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'bottom');

  expect(paneStore.layout.type).toBe('split');
  if (paneStore.layout.type === 'split') {
    expect(paneStore.layout.orientation).toBe('vertical');
    expect(paneStore.layout.children).toHaveLength(2);
    if (paneStore.layout.children[0].type === 'pane') {
      expect(paneStore.layout.children[0].paneId).toBe(firstPane.id);
    }
    if (paneStore.layout.children[1].type === 'pane') {
      const newPaneId = paneStore.layout.children[1].paneId;
      expect(paneStore.panes[newPaneId]).toBeDefined();
    }
  }
});

test('removePaneFromLayout should remove pane and collapse parent split', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');

  const splitLayout = paneStore.layout;
  const newPaneId =
    splitLayout.type === 'split' && splitLayout.children[1].type === 'pane'
      ? splitLayout.children[1].paneId
      : '';

  paneStore.removePaneFromLayout(newPaneId);

  expect(paneStore.layout.type).toBe('pane');
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).toBe(firstPane.id);
  }
});

test('removePaneFromLayout should handle nested splits', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  const secondPane = await paneStore.initNewPane();
  await paneStore.splitPaneInLayout(firstPane.id, 'right');

  const thirdPane = await paneStore.initNewPane();
  await paneStore.splitPaneInLayout(secondPane.id, 'bottom');

  paneStore.removePaneFromLayout(thirdPane.id);

  expect(paneStore.layout.type).toBe('split');
  if (paneStore.layout.type === 'split') {
    expect(paneStore.layout.children).toHaveLength(2);
  }
});

test('moveTab should move tab between panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  const secondPane = await paneStore.initNewPane();

  const firstTabId = Object.keys(firstPane.tabs.value)[0];
  const firstTab = firstPane.tabs.value[firstTabId];

  paneStore.moveTab(firstTab.id, firstPane.id, secondPane.id);

  expect(Object.keys(firstPane.tabs.value)).toHaveLength(0);
  expect(Object.keys(secondPane.tabs.value)).toHaveLength(2);
  expect(firstTab.id in secondPane.tabs.value).toBe(true);
});

test('moveTab should set moved tab as active in target pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  const secondPane = await paneStore.initNewPane();

  const firstTabId = Object.keys(firstPane.tabs.value)[0];
  const firstTab = firstPane.tabs.value[firstTabId];
  const originalSecondActiveTabId = secondPane.activeTabId;

  paneStore.moveTab(firstTab.id, firstPane.id, secondPane.id);

  expect(secondPane.activeTabId).toBe(firstTab.id);
  expect(secondPane.activeTabId).not.toBe(originalSecondActiveTabId);
});

test('moveTab should update source pane active tab when moving active tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const sourcePane = await paneStore.initNewPane();
  const targetPane = await paneStore.initNewPane();

  paneStore.activePaneId = sourcePane.id;
  await paneStore.addTab();
  await paneStore.addTab();

  const initialTabId = sourcePane.activeTabId;
  const tabKeysBeforeMove = Object.keys(sourcePane.tabs.value);
  const remainingTabIds = tabKeysBeforeMove.filter((id) => id !== initialTabId);

  paneStore.selectTab(sourcePane.id, initialTabId);

  expect(sourcePane.activeTabId).toBe(initialTabId);
  expect(tabKeysBeforeMove).toHaveLength(3);

  paneStore.moveTab(initialTabId, sourcePane.id, targetPane.id);

  const sourcePaneAfterMove = paneStore.getPane(sourcePane.id);
  const activeAfterMove = sourcePaneAfterMove?.value.activeTabId;

  expect(activeAfterMove).not.toBe(initialTabId);
  expect(remainingTabIds).toContain(activeAfterMove);
  expect(targetPane.activeTabId).toBe(initialTabId);
  expect(Object.keys(sourcePane.tabs.value)).toHaveLength(2);
});

test('moveTab should clear active tab id when moving the last tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const sourcePane = await paneStore.initNewPane();
  const targetPane = await paneStore.initNewPane();
  await paneStore.initNewPane();

  paneStore.activePaneId = sourcePane.id;

  const onlyTabId = sourcePane.activeTabId;

  expect(Object.keys(sourcePane.tabs.value)).toHaveLength(1);
  expect(sourcePane.activeTabId).toBe(onlyTabId);

  paneStore.moveTab(onlyTabId, sourcePane.id, targetPane.id);

  const sourcePaneAfterMove = paneStore.getPane(sourcePane.id);

  expect(sourcePaneAfterMove).toBeUndefined();
  expect(targetPane.activeTabId).toBe(onlyTabId);
  expect(paneStore.activePaneId).toBe(targetPane.id);
});

test('moveTab should handle missing source pane gracefully', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const targetPane = await paneStore.initNewPane();
  const fakeTabId = 'fake-tab-id';
  const nonExistentPaneId = 'non-existent-pane-id';

  expect(() => {
    paneStore.moveTab(fakeTabId, nonExistentPaneId, targetPane.id);
  }).not.toThrow();

  expect(Object.keys(targetPane.tabs.value)).toHaveLength(1);
});

test('moveTab should handle missing target pane gracefully', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const sourcePane = await paneStore.initNewPane();
  const tabId = sourcePane.activeTabId;
  const nonExistentPaneId = 'non-existent-pane-id';

  expect(() => {
    paneStore.moveTab(tabId, sourcePane.id, nonExistentPaneId);
  }).not.toThrow();

  expect(Object.keys(sourcePane.tabs.value)).toHaveLength(1);
  expect(sourcePane.activeTabId).toBe(tabId);
});

test('moveTab should handle non-existent tab', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  const secondPane = await paneStore.initNewPane();

  const originalFirstTabsCount = Object.keys(firstPane.tabs.value).length;
  const originalSecondTabsCount = Object.keys(secondPane.tabs.value).length;

  paneStore.moveTab('non-existent-tab', firstPane.id, secondPane.id);

  expect(Object.keys(firstPane.tabs.value)).toHaveLength(originalFirstTabsCount);
  expect(Object.keys(secondPane.tabs.value)).toHaveLength(originalSecondTabsCount);
});

test('moveTab should handle non-existent source pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const targetPane = await paneStore.initNewPane();
  const originalTabsCount = Object.keys(targetPane.tabs.value).length;

  paneStore.moveTab('some-tab-id', 'non-existent-pane', targetPane.id);

  expect(Object.keys(targetPane.tabs.value)).toHaveLength(originalTabsCount);
});

test('moveTab should handle non-existent target pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const sourcePane = await paneStore.initNewPane();
  const firstTabId = Object.keys(sourcePane.tabs.value)[0];
  const firstTab = sourcePane.tabs.value[firstTabId];
  const originalTabsCount = Object.keys(sourcePane.tabs.value).length;

  paneStore.moveTab(firstTab.id, sourcePane.id, 'non-existent-pane');

  expect(Object.keys(sourcePane.tabs.value)).toHaveLength(originalTabsCount);
});

test('splitPaneInLayout should handle deep nesting', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const rootNode = paneStore.layout;
  const rootPaneId = rootNode.type === 'pane' ? rootNode.paneId : '';

  await paneStore.splitPaneInLayout(rootPaneId, 'right');
  const level1Split = paneStore.layout;

  const secondPaneNode = level1Split.type === 'split' ? level1Split.children[1] : null;
  const secondPaneId = secondPaneNode?.type === 'pane' ? secondPaneNode.paneId : '';

  await paneStore.splitPaneInLayout(secondPaneId, 'bottom');

  const finalLayout = paneStore.layout;

  expect(finalLayout.type).toBe('split');
  if (finalLayout.type === 'split') {
    expect(finalLayout.children).toHaveLength(2);
    expect(finalLayout.children[1].type).toBe('split');
    if (finalLayout.children[1].type === 'split') {
      expect(finalLayout.children[1].orientation).toBe('vertical');
      expect(finalLayout.children[1].children).toHaveLength(2);
    }
  }
});

test('removePaneFromLayout should handle removing middle node in deep split', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const rootPaneId = paneStore.activePaneId ?? '';

  await paneStore.splitPaneInLayout(rootPaneId, 'right');
  const firstSplit = paneStore.layout;
  const middlePaneId =
    firstSplit.type === 'split' && firstSplit.children[1].type === 'pane'
      ? firstSplit.children[1].paneId
      : '';

  await paneStore.splitPaneInLayout(middlePaneId, 'right');

  paneStore.removePaneFromLayout(middlePaneId);

  const finalLayout = paneStore.layout;

  expect(finalLayout.type).toBe('split');
  if (finalLayout.type === 'split') {
    expect(finalLayout.children).toHaveLength(2);
    expect(finalLayout.children.every((child) => child.type === 'pane')).toBe(true);
  }
});

test('splitPaneInLayout should handle non-existent paneId gracefully', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const originalLayout = JSON.stringify(paneStore.layout);

  const result = await paneStore.splitPaneInLayout('non-existent-pane', 'right');

  expect(result).toBeNull();
  expect(JSON.stringify(paneStore.layout)).toBe(originalLayout);
});

test('removePaneFromLayout should handle non-existent paneId gracefully', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const originalLayout = JSON.stringify(paneStore.layout);

  paneStore.removePaneFromLayout('non-existent-pane');

  expect(JSON.stringify(paneStore.layout)).toBe(originalLayout);
});

test('removePaneFromLayout should handle single pane layout', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const originalLayout = paneStore.layout;
  const paneId = originalLayout.type === 'pane' ? originalLayout.paneId : '';

  paneStore.removePaneFromLayout(paneId);

  expect(paneStore.layout).toEqual(originalLayout);
});

test('splitPaneInLayout should create new pane in panes record', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const initialPaneCount = Object.keys(paneStore.panes).length;
  const rootPaneId = paneStore.activePaneId ?? '';

  await paneStore.splitPaneInLayout(rootPaneId, 'right');

  expect(Object.keys(paneStore.panes)).toHaveLength(initialPaneCount + 1);
});

test('cleanupEmptyPane should remove pane from layout tree', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');

  const splitLayout = paneStore.layout;
  const secondPaneId =
    splitLayout.type === 'split' && splitLayout.children[1].type === 'pane'
      ? splitLayout.children[1].paneId
      : '';
  const secondTabId = paneStore.panes[secondPaneId].value.activeTabId;

  expect(paneStore.layout.type).toBe('split');
  expect(Object.keys(paneStore.panes)).toHaveLength(2);

  paneStore.closeTab(secondPaneId, secondTabId);

  expect(paneStore.layout.type).toBe('pane');
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).toBe(firstPane.id);
  }
});

test('initLayout should fix corrupted layout with empty paneId', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();

  paneStore.layout = { type: 'pane', id: 'old-id', paneId: '' };

  paneStore.initLayout();

  expect(paneStore.layout.type).toBe('pane');
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).toBe(pane.id);
    expect(paneStore.layout.paneId).not.toBe('');
  }
});

test('initLayout should not recreate valid layout', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.initLayout();

  const originalLayoutId = paneStore.layout.id;

  paneStore.initLayout();

  expect(paneStore.layout.id).toBe(originalLayoutId);
});

test('restorePanes should initialize layout after restoration', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();
  paneStore.initLayout();

  const snapshot: PanesSnapshot = {
    panes: [
      {
        id: pane.id,
        activeTabId: pane.activeTabId,
        tabs: [
          {
            id: pane.activeTabId,
            title: 'Test Tab',
            paneId: pane.id,
            routeLocation: {
              path: '/',
              params: {},
              query: {},
              hash: '',
              name: 'InitialPage',
            },
          },
        ],
      },
    ],
    activePaneId: pane.id,
    timestamp: Date.now(),
  };

  paneStore.layout = { type: 'pane', id: 'corrupted-id', paneId: '' };

  await paneStore.restorePanesSnapshot(snapshot);
  paneStore.initLayout();

  const finalLayout = paneStore.layout;
  expect(finalLayout.type).toBe('pane');
  if (finalLayout.type === 'pane') {
    expect(finalLayout.paneId).toBe(pane.id);
    expect(finalLayout.paneId).not.toBe('');
  }
});

test('activePane should return null when activePaneId is empty', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.activePaneId = '';

  expect(paneStore.activePane).toBeNull();
});

test('activePane should return null when activePaneId does not exist in panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane();
  paneStore.activePaneId = 'non-existent-pane-id';

  expect(paneStore.activePane).toBeNull();
});

test('restorePanesSnapshot should call initLayout after restoration', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane();

  const snapshot: PanesSnapshot = {
    panes: [
      {
        id: pane.id,
        activeTabId: pane.activeTabId,
        tabs: [
          {
            id: pane.activeTabId,
            title: 'Test Tab',
            paneId: pane.id,
            routeLocation: {
              path: '/',
              params: {},
              query: {},
              hash: '',
              name: 'InitialPage',
            },
          },
        ],
      },
    ],
    activePaneId: pane.id,
    timestamp: Date.now(),
  };

  paneStore.layout = { type: 'pane', id: 'corrupted-id', paneId: '' };

  await paneStore.restorePanesSnapshot(snapshot);

  expect(paneStore.layout.type).toBe('pane');
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.layout.paneId).not.toBe('');
    expect(paneStore.panes[paneStore.layout.paneId]).toBeDefined();
  }
});

test('splitPaneInLayout should handle deeply nested layouts', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');
  const pane2Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id)!;

  await paneStore.splitPaneInLayout(pane2Id, 'bottom');
  const pane3Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id && id !== pane2Id)!;

  await paneStore.splitPaneInLayout(pane3Id, 'right');

  expect(paneStore.layout.type).toBe('split');
  expect(Object.keys(paneStore.panes)).toHaveLength(4);

  const findPaneInLayout = (node: typeof paneStore.layout, paneId: string): boolean => {
    if (node.type === 'pane') {
      return node.paneId === paneId;
    }
    return node.children.some((child) => findPaneInLayout(child, paneId));
  };

  expect(findPaneInLayout(paneStore.layout, firstPane.id)).toBe(true);
  expect(findPaneInLayout(paneStore.layout, pane2Id)).toBe(true);
  expect(findPaneInLayout(paneStore.layout, pane3Id)).toBe(true);
});

test('removePaneFromLayout should handle deeply nested pane removal', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');
  const pane2Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id)!;

  await paneStore.splitPaneInLayout(pane2Id, 'bottom');
  const pane3Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id && id !== pane2Id)!;

  await paneStore.splitPaneInLayout(pane3Id, 'right');
  const pane4Id = Object.keys(paneStore.panes).find(
    (id) => id !== firstPane.id && id !== pane2Id && id !== pane3Id,
  )!;

  expect(Object.keys(paneStore.panes)).toHaveLength(4);

  const pane4 = paneStore.panes[pane4Id].value;
  paneStore.closeTab(pane4Id, pane4.activeTabId);

  expect(Object.keys(paneStore.panes)).toHaveLength(3);
  expect(paneStore.panes[pane4Id]).toBeUndefined();
});

test('moveTab should work across deeply nested panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');
  const pane2Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id)!;

  await paneStore.splitPaneInLayout(pane2Id, 'bottom');
  const pane3Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id && id !== pane2Id)!;

  const pane3 = paneStore.panes[pane3Id].value;

  paneStore.activePaneId = firstPane.id;
  const sourceTab = await paneStore.addTab();
  const sourceTabId = sourceTab!.id;

  expect(firstPane.tabs.value[sourceTabId]).toBeDefined();
  expect(pane3.tabs.value[sourceTabId]).toBeUndefined();

  paneStore.moveTab(sourceTabId, firstPane.id, pane3Id);

  expect(firstPane.tabs.value[sourceTabId]).toBeUndefined();
  expect(pane3.tabs.value[sourceTabId]).toBeDefined();
});

test('splitPaneInLayout with all directions creates correct layout', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const centerPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(centerPane.id, 'right');
  await paneStore.splitPaneInLayout(centerPane.id, 'left');
  await paneStore.splitPaneInLayout(centerPane.id, 'top');
  await paneStore.splitPaneInLayout(centerPane.id, 'bottom');

  expect(Object.keys(paneStore.panes)).toHaveLength(5);
  expect(paneStore.panes[centerPane.id]).toBeDefined();
});

test('multiple concurrent closeTab operations maintain layout consistency', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');
  const pane2Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id)!;
  const pane2 = paneStore.panes[pane2Id].value;

  await paneStore.splitPaneInLayout(pane2Id, 'bottom');
  const pane3Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id && id !== pane2Id)!;
  const pane3 = paneStore.panes[pane3Id].value;

  const initialPaneCount = Object.keys(paneStore.panes).length;
  expect(initialPaneCount).toBe(3);

  paneStore.closeTab(pane2Id, pane2.activeTabId);
  paneStore.closeTab(pane3Id, pane3.activeTabId);

  expect(Object.keys(paneStore.panes).length).toBeLessThan(initialPaneCount);
  expect(paneStore.layout.type).toBe('pane');
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.panes[paneStore.layout.paneId]).toBeDefined();
  }
});

test('splitPaneInLayout should maintain proper parent-child relationships', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const rootPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(rootPane.id, 'right');
  await paneStore.splitPaneInLayout(rootPane.id, 'bottom');

  expect(paneStore.layout.type).toBe('split');

  if (paneStore.layout.type === 'split') {
    expect(paneStore.layout.children.length).toBeGreaterThan(0);

    const findNodeDepth = (node: LayoutNode, paneId: string, depth = 0): number => {
      if (node.type === 'pane') {
        return node.paneId === paneId ? depth : -1;
      }
      if (node.type === 'split') {
        for (const child of node.children) {
          const result = findNodeDepth(child, paneId, depth + 1);
          if (result !== -1) return result;
        }
      }
      return -1;
    };

    expect(findNodeDepth(paneStore.layout, rootPane.id)).toBeGreaterThanOrEqual(0);
  }
});

test('layout should remain valid after removing middle pane in three-pane split', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane();
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPane.id, 'right');
  const pane2Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id)!;
  const pane2 = paneStore.panes[pane2Id].value;

  await paneStore.splitPaneInLayout(pane2Id, 'bottom');
  const pane3Id = Object.keys(paneStore.panes).find((id) => id !== firstPane.id && id !== pane2Id)!;
  const pane3 = paneStore.panes[pane3Id].value;

  const initialPaneCount = Object.keys(paneStore.panes).length;
  expect(initialPaneCount).toBe(3);

  paneStore.closeTab(pane2Id, pane2.activeTabId);
  paneStore.closeTab(pane3Id, pane3.activeTabId);

  expect(Object.keys(paneStore.panes).length).toBeLessThan(initialPaneCount);
  expect(paneStore.layout.type).toBe('pane');
  if (paneStore.layout.type === 'pane') {
    expect(paneStore.panes[paneStore.layout.paneId]).toBeDefined();
  }
});
