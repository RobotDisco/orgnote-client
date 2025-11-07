import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands, RouteNames } from 'orgnote-api';
import { useNotePickCompletion } from 'src/composables/file-pick-completion';
import { usePaneStore } from 'src/stores/pane';

export function getNoteCommands(): Command[] {
  const paneStore = usePaneStore();

  const commands: Command[] = [
    {
      command: DefaultCommands.OPEN_NOTE,
      title: DefaultCommands.OPEN_NOTE,
      group: 'note',
      icon: 'sym_o_edit_square',
      handler: async (api: OrgNoteApi, params?: CommandHandlerParams<{ path: string }>) => {
        const path = params?.data?.path ?? (await useNotePickCompletion(api, '/'));

        if (!path) {
          return;
        }

        await paneStore.navigate({
          name: RouteNames.EditNote,
          params: { path },
        });
      },
    },
  ];

  return commands;
}
