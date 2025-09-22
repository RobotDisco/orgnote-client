import type { Command, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';

export function getModalCommands(): Command[] {
  const commands: Command[] = [
    {
      command: DefaultCommands.CLOSE_MODAL,
      title: DefaultCommands.CLOSE_MODAL,
      group: 'modal',
      icon: 'sym_o_close',
      handler: async (api: OrgNoteApi) => {
        api.ui.useModal().close();
      },
    },
  ];

  return commands;
}
