import { expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaneStore } from 'src/stores/pane';

test('initNewPane followed by initLayout should populate layout with correct paneId', async () => {
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
  expect(paneStore.activePaneId).toBe(pane.id);
});

test('getPane with empty string should return undefined', () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = paneStore.getPane('');
  expect(pane).toBeUndefined();
});

test('getPane with valid id should return pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  const pane = await paneStore.initNewPane({ title: 'Test Pane' });
  const retrievedPane = paneStore.getPane(pane.id);

  expect(retrievedPane?.value).toBeDefined();
  expect(retrievedPane?.value.id).toBe(pane.id);
});

test('layout should be updated when initLayout is called with active pane', async () => {
  setActivePinia(createPinia());
  const paneStore = usePaneStore();

  await paneStore.initNewPane({ title: 'Pane 1' });
  const pane2 = await paneStore.initNewPane({ title: 'Pane 2' });

  paneStore.initLayout();

  const layout = paneStore.layout;
  expect(layout.type).toBe('pane');
  expect((layout as { paneId?: string }).paneId).toBe(pane2.id);
});
