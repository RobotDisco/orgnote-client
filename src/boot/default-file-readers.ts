import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { DefaultCommands } from 'orgnote-api';

// TODO: feat/stable-beta create boot wrapper which can show notifications about current status
export default defineBoot(async () => {
  const fileReader = api.core.useFileReader();
  const commands = api.core.useCommands();

  fileReader.addReader('\\.org(\\.gpg)?$', async (path: string) => {
    commands.execute(DefaultCommands.OPEN_NOTE, { path });
  });
});
