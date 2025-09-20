import type { Command, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N, TABS_COMMAND_GROUP } from 'orgnote-api';
import { useTabCompletion } from '../composables/tab-completion';

export function getTabsCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.NEW_TAB,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_add_box',
      title: I18N.ADD_NEW_TAB,
      handler: async (api: OrgNoteApi, params) => {
        const pane = api.core.usePane();
        const tab = await pane.addTab(params.data);
        pane.selectTab(tab.paneId, tab.id);
      },
    },
    {
      command: DefaultCommands.TABS,
      group: TABS_COMMAND_GROUP,
      icon: 'sym_o_tabs',
      title: I18N.TABS,
      handler: useTabCompletion,
    },
  ];

  return commands;
}
