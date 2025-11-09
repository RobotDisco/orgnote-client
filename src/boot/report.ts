import { defineBoot } from '@quasar/app-vite/wrappers';
import type { ErrorReporter } from 'src/utils/error-reporter';
import { createErrorReporter } from 'src/utils/error-reporter';
import { logger } from './logger';
import { useNotificationsStore } from 'src/stores/notifications';

let reporter: ErrorReporter;

const initReport = (): ErrorReporter => {
  const notifications = useNotificationsStore();
  reporter = createErrorReporter(logger, notifications);
  return reporter;
};

export default defineBoot(() => {
  initReport();
});

export { reporter, initReport };
