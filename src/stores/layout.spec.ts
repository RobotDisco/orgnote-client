import { test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from './layout';
import { usePaneStore } from './pane';
import type { LayoutSnapshot } from 'orgnote-api';

vi.mock('src/boot/repositories', () => ({
  repositories: {
    layoutSnapshotRepository: {
      save: vi.fn(() => Promise.resolve()),
      getLatest: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

vi.mock('src/boot/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

beforeEach(async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

test('should initialize layout with single pane', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();

  expect(layoutStore.layout).toBeDefined();
  expect(layoutStore.layout?.type).toBe('pane');
  expect(paneStore.activePaneId).toBeTruthy();
});

test('should initialize layout with existing activePaneId', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  paneStore.setActivePane(pane.id);

  await layoutStore.initLayout();

  expect(layoutStore.layout?.type).toBe('pane');
  if (layoutStore.layout?.type === 'pane') {
    expect(layoutStore.layout.paneId).toBe(pane.id);
  }
});

test('should create pane when no activePaneId exists', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  expect(paneStore.activePaneId).toBeNull();

  await layoutStore.initLayout();

  expect(paneStore.activePaneId).toBeTruthy();
  expect(Object.keys(paneStore.panes)).toHaveLength(1);
});

test('should add initial tab to new pane', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();

  const paneId = paneStore.activePaneId!;
  const pane = paneStore.getPane(paneId);
  const tabCount = Object.keys(pane.value.tabs.value).length;

  expect(tabCount).toBe(1);
});

test('should split pane horizontally to left', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'left');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.orientation).toBe('horizontal');
    expect(layoutStore.layout.children).toHaveLength(2);
    expect(layoutStore.layout.children[0].type).toBe('pane');
  }
});

test('should split pane horizontally to right', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.orientation).toBe('horizontal');
    expect(layoutStore.layout.children[1].type).toBe('pane');
  }
});

test('should split pane vertically to top', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'top');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.orientation).toBe('vertical');
    expect(layoutStore.layout.children[0].type).toBe('pane');
  }
});

test('should split pane vertically to bottom', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'bottom');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.orientation).toBe('vertical');
    expect(layoutStore.layout.children[1].type).toBe('pane');
  }
});

test('should create pane with initial tab when splitting', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right', true);

  expect(newPaneId).toBeTruthy();
  const newPane = paneStore.getPane(newPaneId!);
  const tabCount = Object.keys(newPane.value.tabs.value).length;
  expect(tabCount).toBe(1);
});

test('should create empty pane when splitting without initial tab', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right', false);

  expect(newPaneId).toBeTruthy();
  const newPane = paneStore.getPane(newPaneId!);
  const tabCount = Object.keys(newPane.value.tabs.value).length;
  expect(tabCount).toBe(0);
});

test('should update layout tree correctly after split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(layoutStore.layout?.type).toBe('split');
  if (layoutStore.layout?.type === 'split') {
    expect(layoutStore.layout.children).toHaveLength(2);
  }
});

test('should activate new pane after split', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;

  const newPaneId = await layoutStore.splitPaneInLayout(originalPaneId, 'right');

  expect(paneStore.activePaneId).toBe(newPaneId);
});

test('should throw error when splitting non-existent pane', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();

  await expect(layoutStore.splitPaneInLayout('non-existent-id', 'right')).rejects.toThrow('Pane non-existent-id not found in layout');
});

test('should init layout before split if layout is missing', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  const pane = await paneStore.createPane();
  await paneStore.addTab(pane.id);
  paneStore.setActivePane(pane.id);

  await layoutStore.initLayout();
  const newPaneId = await layoutStore.splitPaneInLayout(pane.id, 'right');

  expect(newPaneId).toBeTruthy();
  expect(layoutStore.layout).toBeDefined();
});

test('should remove pane from layout tree', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');

  layoutStore.removePaneFromLayout(pane2Id!);

  expect(layoutStore.layout?.type).toBe('pane');
  if (layoutStore.layout?.type === 'pane') {
    expect(layoutStore.layout.paneId).toBe(pane1Id);
  }
});

test('should normalize split node when only one child remains', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');

  layoutStore.removePaneFromLayout(pane2Id!);

  expect(layoutStore.layout?.type).toBe('pane');
});

test('should handle removing from nested split nodes', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1Id = paneStore.activePaneId!;
  const pane2Id = await layoutStore.splitPaneInLayout(pane1Id, 'right');
  const pane3Id = await layoutStore.splitPaneInLayout(pane2Id!, 'bottom');

  layoutStore.removePaneFromLayout(pane3Id!);

  expect(layoutStore.layout?.type).toBe('split');
});

test('should normalize sizes to 100%', () => {
  const layoutStore = useLayoutStore();

  const normalized = layoutStore.normalizeSizes([30, 70]);

  expect(normalized).toEqual([30, 70]);
});

test('should handle invalid sizes', () => {
  const layoutStore = useLayoutStore();

  const normalized = layoutStore.normalizeSizes([20, 30]);

  const sum = normalized.reduce((a, b) => a + b, 0);
  expect(Math.abs(sum - 100)).toBeLessThan(0.01);
});

test('should save workspace snapshot', async () => {
  await import('src/boot/repositories');
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();

  const snapshot = layoutStore.getLayoutSnapshot();

  expect(snapshot).toHaveProperty('panes');
  expect(snapshot).toHaveProperty('activePaneId');
  expect(snapshot).toHaveProperty('timestamp');
  expect(snapshot).toHaveProperty('layout');
});

test('should restore workspace from snapshot', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const originalPaneId = paneStore.activePaneId!;
  const snapshot = layoutStore.getLayoutSnapshot();

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(paneStore.activePaneId).toBe(originalPaneId);
  expect(layoutStore.layout).toBeDefined();
});

test('should include layout in snapshot', async () => {
  const layoutStore = useLayoutStore();

  await layoutStore.initLayout();
  const snapshot = layoutStore.getLayoutSnapshot();

  expect(snapshot.layout).toBeDefined();
});

test('should restore activePaneId from snapshot', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const pane1 = await paneStore.createPane();
  await paneStore.addTab(pane1.id);

  const snapshot: LayoutSnapshot = {
    panes: [
      {
        id: pane1.id,
        activeTabId: '',
        tabs: [],
      },
    ],
    activePaneId: pane1.id,
    timestamp: Date.now(),
    layout: layoutStore.layout,
  };

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(paneStore.activePaneId).toBe(pane1.id);
});

test('should clear panes before restore', async () => {
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  await layoutStore.initLayout();
  const existingPanesCount = Object.keys(paneStore.panes).length;
  expect(existingPanesCount).toBeGreaterThan(0);

  const snapshot: LayoutSnapshot = {
    panes: [],
    activePaneId: '',
    timestamp: Date.now(),
    layout: undefined,
  };

  await layoutStore.restoreLayoutSnapshot(snapshot);

  expect(Object.keys(paneStore.panes)).toHaveLength(0);
});

test('should init layout when no snapshot available', async () => {
  const { repositories } = await import('src/boot/repositories');
  const layoutStore = useLayoutStore();
  const paneStore = usePaneStore();

  (repositories.layoutSnapshotRepository.getLatest as ReturnType<typeof vi.fn>).mockResolvedValue(
    null,
  );

  await layoutStore.restoreLayout();

  expect(paneStore.activePaneId).toBeTruthy();
});
