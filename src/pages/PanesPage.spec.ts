import { expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaneStore } from 'src/stores/pane';

vi.mock('src/utils/pane-router', () => ({
  createPaneRouter: vi.fn(() =>
    Promise.resolve({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      currentRoute: {
        value: {
          path: '/',
          fullPath: '/',
          params: {},
          query: {},
          hash: '',
          name: 'InitialPage',
        },
      },
    }),
  ),
}));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      usePane: () => usePaneStore(),
      useNotifications: () => ({
        notify: vi.fn(),
        error: vi.fn(),
      }),
    },
  },
}));

test('PanesPage should pass correct UUID pane IDs when layout has split panes', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const firstPane = await paneStore.initNewPane({ title: 'First Pane' });
  const firstPaneId = firstPane.id;
  paneStore.initLayout();

  await paneStore.splitPaneInLayout(firstPaneId, 'right');

  const layout = paneStore.layout;
  expect(layout.type).toBe('split');

  const secondPaneId =
    layout.type === 'split' && layout.children[1].type === 'pane' ? layout.children[1].paneId : '';

  expect(firstPaneId).not.toBe('0');
  expect(firstPaneId).not.toBe('1');
  expect(secondPaneId).not.toBe('0');
  expect(secondPaneId).not.toBe('1');
  expect(firstPaneId).toBeTruthy();
  expect(secondPaneId).toBeTruthy();
});

test('PanesPage store should have valid pane IDs accessible via getPane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane({ title: 'Test Pane' });
  const paneId = pane.id;
  paneStore.initLayout();

  expect(paneStore.panes[paneId]).toBeDefined();
  expect(paneStore.panes[paneId].value.id).toBe(paneId);

  const retrievedPane = paneStore.getPane(paneId);
  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value.id).toBe(paneId);
});

test('PanesPage store should initialize layout when pane is created', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const initialLayout = paneStore.layout;
  expect(initialLayout.type).toBe('pane');
  expect((initialLayout as { paneId?: string }).paneId).toBe('');

  const pane = await paneStore.initNewPane({ title: 'Test Pane' });
  paneStore.initLayout();

  const updatedLayout = paneStore.layout;
  expect(updatedLayout.type).toBe('pane');
  expect((updatedLayout as { paneId?: string }).paneId).toBe(pane.id);
  expect((updatedLayout as { paneId?: string }).paneId).not.toBe('');
});

test('PanesPage workflow should call initLayout after initNewPane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const initialActivePaneId = paneStore.activePaneId;
  expect(initialActivePaneId).toBeNull();

  const pane = await paneStore.initNewPane({ title: 'Test Pane' });
  paneStore.initLayout();

  const layout = paneStore.layout;
  expect(layout.type).toBe('pane');
  expect((layout as { paneId?: string }).paneId).toBe(pane.id);
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('AppPane should be accessible with valid paneId after initialization', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane({ title: 'Test Pane' });
  paneStore.initLayout();

  const retrievedPane = paneStore.getPane(pane.id);
  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value.id).toBe(pane.id);
});
