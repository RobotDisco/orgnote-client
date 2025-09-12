import { defineBoot } from '@quasar/app-vite/wrappers';
import type { OrgNoteApi } from 'orgnote-api';
import { api } from './api';
import { createReportInstance } from 'src/utils/report';
import type { ErrorReporter } from 'src/utils/error-reporter';

let report: ErrorReporter;

const initReport = (orgApi: OrgNoteApi): ErrorReporter => {
  report = createReportInstance(orgApi);
  return report;
};

export default defineBoot(() => {
  initReport(api);
});

export { report, initReport };

