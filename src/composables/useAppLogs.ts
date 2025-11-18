import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import { I18N } from 'orgnote-api';

interface ErrorBuffer {
  exportAsText: () => string;
  getAll: () => unknown[];
}

type WindowWithErrorBuffer = Window & { __errorBuffer?: ErrorBuffer };

const NO_ERRORS_MARKER = 'No errors recorded';

export const useAppLogs = () => {
  const { t } = useI18n();
  const logStore = api.core.useLog();

  const fallbackErrors = computed(() => {
    const buffer = (window as WindowWithErrorBuffer).__errorBuffer;
    if (!buffer) return '';

    const errors = buffer.exportAsText();
    if (!errors || errors === NO_ERRORS_MARKER) return '';

    return errors;
  });

  const hasFallbackErrors = computed(() => fallbackErrors.value.length > 0);

  const storeLogs = computed(() => logStore.logs);
  const hasStoreLogs = computed(() => storeLogs.value.length > 0);

  const errorLogText = computed(() => {
    const storeText = logStore.exportAsText();
    const fallbackText = fallbackErrors.value;

    if (!hasFallbackErrors.value && !hasStoreLogs.value) return t(I18N.NO_ERRORS);
    if (!hasFallbackErrors.value) return storeText;
    if (!hasStoreLogs.value) return fallbackText;

    return `=== ${t(I18N.BOOT_ERRORS)} ===\n${fallbackText}\n\n=== ${t(I18N.APP_ERRORS)} ===\n${storeText}`;
  });

  return {
    fallbackErrors,
    hasFallbackErrors,
    storeLogs,
    hasStoreLogs,
    errorLogText,
  };
};
