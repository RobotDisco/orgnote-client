import { defineBoot } from '@quasar/app-vite/wrappers';
import { getCompletionCommands } from 'src/commands/completion';
import { getFileManagerCommands } from 'src/commands/file-manager';
import { getGlobalCommands } from 'src/commands/global-commands';
import { getNoteCommands } from 'src/commands/note-commands';
import { getTabsCommands } from 'src/commands/tabs';
import { getRoutesCommands } from 'src/commands/router-commands';
import { getSettingsCommands } from 'src/commands/settings-commands';
import { useCommandsStore } from 'src/stores/command';

export default defineBoot(async ({ router }) => {
  const commandsStore = useCommandsStore();

  commandsStore.add(
    ...getRoutesCommands(router),
    ...getGlobalCommands(),
    ...getSettingsCommands(),
    ...getCompletionCommands(),
    ...getTabsCommands(),
    ...getFileManagerCommands(),
    ...getNoteCommands(),
  );
});
