import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { useAutoSync } from 'src/composables/use-auto-sync';

export default defineBoot(async () => {
  useAutoSync();
  await api.core.useAuth().verifyUser();
});
