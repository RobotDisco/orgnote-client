import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { DefaultCommands } from 'orgnote-api';

// TODO: feat/stable-beta create boot wrapper which can show notifications about current status
export default defineBoot(async () => {
  const fileReader = api.core.useFileReader();
  const pane = api.core.usePane();
  const commands = api.core.useCommands();

  fileReader.addReader('\\.org(\\.gpg)?$', async (path: string) => {
    commands.execute(DefaultCommands.OPEN_NOTE, { path });
    console.log('✎: [line 12][default-file-readers.ts] pane.activeRouter: ', pane.activeRouter);
    return;
  });
});
