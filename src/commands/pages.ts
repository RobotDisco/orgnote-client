import type { Command, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, I18N } from 'orgnote-api';

export function getPagesCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.NEW_TAB,
      group: 'pages',
      icon: 'sym_o_add_box',
      title: I18N.ADD_NEW_TAB,
      handler: async (api: OrgNoteApi, params) => {
        const pane = api.core.usePane();
        const tab = await pane.addTab(params.data);
        pane.selectTab(tab.paneId, tab.id);
      },
    },
  ];

  return commands;
}
