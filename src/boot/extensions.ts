import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';

export default defineBoot(async () => {
  api.utils.logger.info('Syncing extensions and theme...');
  await api.core.useExtensions().sync();
  api.utils.logger.info('Extensions synced.');
  await api.ui.useTheme().sync();
  api.utils.logger.info('Theme synced.');
});
