import { test, expect, vi } from 'vitest';
import { getTabsCommands } from './tabs';
import { DefaultCommands } from 'orgnote-api';
import type { OrgNoteApi, Tab, CommandMeta } from 'orgnote-api';
import type { Router } from 'vue-router';

vi.mock('../composables/tab-completion', () => ({
  useTabCompletion: vi.fn(),
}));

test('getTabsCommands returns expected commands', () => {
  const commands = getTabsCommands();

  expect(commands).toHaveLength(3);
  expect(commands[0].command).toBe(DefaultCommands.NEW_TAB);
  expect(commands[1].command).toBe(DefaultCommands.TABS);
  expect(commands[2].command).toBe(DefaultCommands.SHOW_TAB_SWITCHER);
});

test('NEW_TAB command calls addTab and selectTab', async () => {
  const mockTab: Tab = {
    id: 'tab-1',
    title: 'Test Tab',
    paneId: 'pane-1',
    router: {} as Router,
  };

  const mockPaneStore = {
    activePaneId: 'pane-1',
    addTab: vi.fn().mockResolvedValue(mockTab),
    selectTab: vi.fn(),
  };

  const mockLayoutStore = {};

  const mockModal = {
    close: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      usePane: () => mockPaneStore,
      useLayout: () => mockLayoutStore,
    } as unknown as OrgNoteApi['core'],
    ui: {
      useModal: () => mockModal,
    } as unknown as OrgNoteApi['ui'],
  };

  const commands = getTabsCommands();
  const newTabCommand = commands.find((cmd) => cmd.command === DefaultCommands.NEW_TAB);

  expect(newTabCommand).toBeDefined();

  const params = {
    data: { title: 'Test Tab' },
    meta: {},
  };
  await newTabCommand!.handler(mockApi as OrgNoteApi, params);

  expect(mockPaneStore.addTab).toHaveBeenCalledWith('pane-1', params.data);
  expect(mockPaneStore.selectTab).toHaveBeenCalledWith(mockTab.paneId, mockTab.id);
});

test('TABS command calls useTabCompletion', async () => {
  const { useTabCompletion } = await import('../composables/tab-completion');

  const mockApi = {} as OrgNoteApi;

  const commands = getTabsCommands();
  const tabsCommand = commands.find((cmd) => cmd.command === DefaultCommands.TABS);

  expect(tabsCommand).toBeDefined();

  await tabsCommand!.handler(mockApi);

  expect(useTabCompletion).toHaveBeenCalledWith(mockApi);
});

test('NEW_TAB should not execute when no active pane', async () => {
  const mockPaneStore = {
    activePaneId: null as string | null,
    addTab: vi.fn(),
    selectTab: vi.fn(),
  };

  const mockLayoutStore = {};

  const mockModal = {
    close: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      usePane: () => mockPaneStore,
      useLayout: () => mockLayoutStore,
    } as unknown as OrgNoteApi['core'],
    ui: {
      useModal: () => mockModal,
    } as unknown as OrgNoteApi['ui'],
  };

  const commands = getTabsCommands();
  const newTabCommand = commands.find((cmd) => cmd.command === DefaultCommands.NEW_TAB);

  const params = {
    data: { title: 'Test Tab' },
    meta: {},
  };

  await newTabCommand!.handler(mockApi as OrgNoteApi, params);

  expect(mockPaneStore.addTab).not.toHaveBeenCalled();
  expect(mockPaneStore.selectTab).not.toHaveBeenCalled();
});

test('NEW_TAB should not call selectTab when addTab returns null', async () => {
  const mockPaneStore = {
    activePaneId: 'pane-1',
    addTab: vi.fn().mockResolvedValue(null),
    selectTab: vi.fn(),
  };

  const mockLayoutStore = {};

  const mockModal = {
    close: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      usePane: () => mockPaneStore,
      useLayout: () => mockLayoutStore,
    } as unknown as OrgNoteApi['core'],
    ui: {
      useModal: () => mockModal,
    } as unknown as OrgNoteApi['ui'],
  };

  const commands = getTabsCommands();
  const newTabCommand = commands.find((cmd) => cmd.command === DefaultCommands.NEW_TAB);

  const params = {
    data: { title: 'Test Tab' },
    meta: {},
  };

  await newTabCommand!.handler(mockApi as OrgNoteApi, params);

  expect(mockPaneStore.addTab).toHaveBeenCalledWith('pane-1', params.data);
  expect(mockPaneStore.selectTab).not.toHaveBeenCalled();
});

test('NEW_TAB should close modal after successful tab creation', async () => {
  const mockTab: Tab = {
    id: 'tab-1',
    title: 'Test Tab',
    paneId: 'pane-1',
    router: {} as Router,
  };

  const mockPaneStore = {
    activePaneId: 'pane-1',
    addTab: vi.fn().mockResolvedValue(mockTab),
    selectTab: vi.fn(),
  };

  const mockLayoutStore = {};

  const mockModal = {
    close: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      usePane: () => mockPaneStore,
      useLayout: () => mockLayoutStore,
    } as unknown as OrgNoteApi['core'],
    ui: {
      useModal: () => mockModal,
    } as unknown as OrgNoteApi['ui'],
  };

  const commands = getTabsCommands();
  const newTabCommand = commands.find((cmd) => cmd.command === DefaultCommands.NEW_TAB);

  const params = {
    data: { title: 'Test Tab' },
    meta: {},
  };

  await newTabCommand!.handler(mockApi as OrgNoteApi, params);

  expect(mockModal.close).toHaveBeenCalled();
});

test('NEW_TAB should create tab in specified pane from data.paneId', async () => {
  const mockTab2 = { id: 'tab-2', paneId: 'pane-2', title: 'Tab 2' };

  const mockPaneStore = {
    activePaneId: 'pane-1',
    addTab: vi.fn().mockResolvedValue(mockTab2),
    selectTab: vi.fn(),
  };

  const mockApi = {
    core: { usePane: () => mockPaneStore },
    ui: { useModal: () => ({ close: vi.fn() }) },
  } as unknown as OrgNoteApi;

  const commands = getTabsCommands();
  const newTabCommand = commands.find((c) => c.command === DefaultCommands.NEW_TAB);

  await newTabCommand!.handler(mockApi, {
    data: { paneId: 'pane-2' },
    meta: {} as CommandMeta,
  });

  expect(mockPaneStore.addTab).toHaveBeenCalledWith('pane-2', { paneId: 'pane-2' });
  expect(mockPaneStore.selectTab).toHaveBeenCalledWith('pane-2', 'tab-2');
});

test('NEW_TAB should fallback to activePaneId if no paneId in data', async () => {
  const mockTab = { id: 'tab-1', paneId: 'pane-1', title: 'Tab 1' };

  const mockPaneStore = {
    activePaneId: 'pane-1',
    addTab: vi.fn().mockResolvedValue(mockTab),
    selectTab: vi.fn(),
  };

  const mockApi = {
    core: { usePane: () => mockPaneStore },
    ui: { useModal: () => ({ close: vi.fn() }) },
  } as unknown as OrgNoteApi;

  const commands = getTabsCommands();
  const newTabCommand = commands.find((c) => c.command === DefaultCommands.NEW_TAB);

  await newTabCommand!.handler(mockApi, {
    data: {},
    meta: {} as CommandMeta,
  });

  expect(mockPaneStore.addTab).toHaveBeenCalledWith('pane-1', {});
  expect(mockPaneStore.selectTab).toHaveBeenCalledWith('pane-1', 'tab-1');
});
