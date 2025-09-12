import type { OrgNoteApi } from 'orgnote-api';
import { createErrorReporter } from './error-reporter';

const createReportInstance = (api: OrgNoteApi) =>
  createErrorReporter(api.utils.logger, api.core.useNotifications());

export { createReportInstance };
