import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';

export default defineBoot(() => {
  api.core.useFileWatcher().start();
});
