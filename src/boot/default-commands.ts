import { defineBoot } from '@quasar/app-vite/wrappers';
import { getCompletionCommands } from 'src/commands/completion';
import { getFileManagerCommands } from 'src/commands/file-manager';
import { getGlobalCommands } from 'src/commands/global-commands';
import { getNoteCommands } from 'src/commands/note-commands';
import { getPagesCommands } from 'src/commands/pages';
import { getRoutesCommands } from 'src/commands/router-commands';
import { getSettingsommands as getSettingsCommands } from 'src/commands/settings-commands';
import { useCommandsStore } from 'src/stores/command';

export default defineBoot(async ({ router }) => {
  const commandsStore = useCommandsStore();

  commandsStore.add(
    ...getRoutesCommands(router),
    ...getGlobalCommands(),
    ...getSettingsCommands(),
    ...getCompletionCommands(),
    ...getPagesCommands(),
    ...getFileManagerCommands(),
    ...getNoteCommands(),
  );
});
