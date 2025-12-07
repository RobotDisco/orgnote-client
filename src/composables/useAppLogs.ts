import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { I18N } from 'orgnote-api';
import { computedAsync } from '@vueuse/core';

interface ErrorBuffer {
  exportAsText: () => string;
  getAll: () => unknown[];
}

type WindowWithErrorBuffer = Window & { __errorBuffer?: ErrorBuffer };

interface LogSections {
  bootErrors: string;
  appErrors: string;
}

interface TranslatedLabels {
  noErrors: string;
  bootErrors: string;
  appErrors: string;
}

const NO_ERRORS_MARKER = 'No errors recorded';

const getErrorBuffer = (): ErrorBuffer | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as WindowWithErrorBuffer).__errorBuffer;
};

const extractBufferErrors = (buffer: ErrorBuffer | undefined): string => {
  if (!buffer) return '';
  const errors = buffer.exportAsText();
  if (!errors || errors === NO_ERRORS_MARKER) return '';
  return errors;
};

const formatSection = (label: string, content: string): string => `${label}\n${content}`;

const buildLogsText = (sections: LogSections, labels: TranslatedLabels): string => {
  const hasBootErrors = sections.bootErrors.length > 0;
  const hasAppErrors = sections.appErrors.length > 0;

  if (!hasBootErrors && !hasAppErrors) return labels.noErrors;
  if (!hasBootErrors) return sections.appErrors;
  if (!hasAppErrors) return sections.bootErrors;

  const bootSection = formatSection(labels.bootErrors, sections.bootErrors);
  const appSection = formatSection(labels.appErrors, sections.appErrors);
  return `${bootSection}\n\n${appSection}`;
};

const prependSystemInfo = (sysInfo: string, logsText: string): string => {
  if (!sysInfo) return logsText;
  return `${sysInfo}\n\n${logsText}`;
};

export const useAppLogs = () => {
  const { t } = useI18n();
  const logStore = api.core.useLog();
  const systemInfo = api.core.useSystemInfo();

  const systemInfoText = computedAsync(() => systemInfo.getTextSystemInfo(), '');

  const fallbackErrors = computed(() => extractBufferErrors(getErrorBuffer()));
  const hasFallbackErrors = computed(() => fallbackErrors.value.length > 0);

  const storeLogs = computed(() => logStore.logs);
  const hasStoreLogs = computed(() => storeLogs.value.length > 0);

  const errorLogText = computed(() => {
    const sections: LogSections = {
      bootErrors: fallbackErrors.value,
      appErrors: logStore.exportAsText(),
    };

    const labels: TranslatedLabels = {
      noErrors: t(I18N.NO_ERRORS),
      bootErrors: t(I18N.BOOT_ERRORS),
      appErrors: t(I18N.APP_ERRORS),
    };

    const logsText = buildLogsText(sections, labels);
    return prependSystemInfo(systemInfoText.value, logsText);
  });

  const clearLogs = (): void => {
    logStore.clearLogs();
  };

  return {
    fallbackErrors,
    hasFallbackErrors,
    storeLogs,
    hasStoreLogs,
    errorLogText,
    clearLogs,
  };
};
