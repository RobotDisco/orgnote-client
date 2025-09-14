import { defineBoot } from '@quasar/app-vite/wrappers';
import type { ErrorReporter, ErrorReporterNotifications } from 'src/utils/error-reporter';
import { createErrorReporter } from 'src/utils/error-reporter';
import { logger } from './logger';
import { createPinoLogger } from 'src/utils/logger';
import { useNotificationsStore } from 'src/stores/notifications';

const noopNotifications: ErrorReporterNotifications = { notify: () => {} };
const fallbackLogger = createPinoLogger();
let reporter: ErrorReporter = createErrorReporter(fallbackLogger, noopNotifications);

const initReport = (): ErrorReporter => {
  const notifications = useNotificationsStore();
  reporter = createErrorReporter(logger, notifications);
  return reporter;
};

export default defineBoot(() => {
  initReport();
});

export { reporter, initReport };
