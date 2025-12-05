import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';

export default defineBoot(async () => {
  await api.ui.useTheme().sync();
});
