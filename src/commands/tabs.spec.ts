import { test, expect, vi } from 'vitest';
import { getTabsCommands } from './tabs';
import { DefaultCommands } from 'orgnote-api';
import type { OrgNoteApi, Tab } from 'orgnote-api';
import type { Router } from 'vue-router';

vi.mock('../composables/tab-completion', () => ({
  useTabCompletion: vi.fn(),
}));

test('getTabsCommands returns expected commands', () => {
  const commands = getTabsCommands();

  expect(commands).toHaveLength(2);
  expect(commands[0].command).toBe(DefaultCommands.NEW_TAB);
  expect(commands[1].command).toBe(DefaultCommands.TABS);
});

test('NEW_TAB command calls addTab and selectTab', async () => {
  const mockTab: Tab = {
    id: 'tab-1',
    title: 'Test Tab',
    paneId: 'pane-1',
    router: {} as Router,
  };

  const mockPaneStore = {
    addTab: vi.fn().mockResolvedValue(mockTab),
    selectTab: vi.fn(),
  };

  const mockApi: Partial<OrgNoteApi> = {
    core: {
      usePane: () => mockPaneStore,
    } as unknown as OrgNoteApi['core'],
  };

  const commands = getTabsCommands();
  const newTabCommand = commands.find((cmd) => cmd.command === DefaultCommands.NEW_TAB);

  expect(newTabCommand).toBeDefined();

  const params = {
    data: { title: 'Test Tab' },
    meta: {},
  };
  await newTabCommand!.handler(mockApi as OrgNoteApi, params);

  expect(mockPaneStore.addTab).toHaveBeenCalledWith(params.data);
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
