import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';

defineBoot(async () => {
  await api.core.useExtensions().sync();
});
