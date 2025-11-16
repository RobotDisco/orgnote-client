<template>
  <page-wrapper padding constrained>
    <container-layout gap="lg" :body-scroll="false">
      <template #header>
        <info-card
          icon="sym_o_error"
          :title="$t('error.critical_error')"
          :description="$t('error.description')"
          type="danger"
        />
      </template>

      <app-card class="error-log-card">
        <pre v-if="errorLog">{{ errorLog }}</pre>
        <p v-else class="no-errors">{{ $t('error.no_errors') }}</p>
      </app-card>

      <template #footer>
        <app-card>
          <action-buttons position="right">
            <action-button icon="content_copy" fire-icon="check" :copy-text="errorLog" border>
              <template #text>{{ $t('error.copy_log') }}</template>
            </action-button>
            <app-button @click="reload" type="danger">{{ $t('error.reload') }}</app-button>
          </action-buttons>
        </app-card>
      </template>
    </container-layout>
  </page-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LogRecord } from 'orgnote-api';
import AppButton from 'src/components/AppButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import { repositories } from 'src/boot/repositories';
import PageWrapper from 'src/components/PageWrapper.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import InfoCard from 'src/components/InfoCard.vue';
import AppCard from 'src/components/AppCard.vue';

interface ErrorBuffer {
  exportAsText: () => string;
  getAll: () => unknown[];
}

type WindowWithErrorBuffer = Window & { __errorBuffer?: ErrorBuffer };

const ERROR_LIMIT = 50;
const NO_ERRORS_MARKER = 'No errors recorded';

const { t } = useI18n();
const errorLog = ref<string>('');
const errorCount = ref<number>(0);

const reload = (): void => {
  window.location.assign('/');
};

const extractContext = (context?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!context) return undefined;
  if (Object.keys(context).length === 0) return undefined;

  const contextCopy = { ...context };
  delete contextCopy.stack;

  return Object.keys(contextCopy).length > 0 ? contextCopy : undefined;
};

const formatErrorRecord = (record: LogRecord, index: number, total: number): string => {
  const timestamp = record.ts.toISOString();
  const number = total - index;
  const parts = [`[${number}] ${timestamp}`, record.message];

  if (record.context?.stack) {
    parts.push(String(record.context.stack));
  }

  const context = extractContext(record.context);
  if (context) {
    parts.push(`Context: ${JSON.stringify(context, null, 2)}`);
  }

  return `\n${parts.join('\n')}`;
};

const formatAppErrors = (records: LogRecord[]): string => {
  if (records.length === 0) return '';

  return records.map((record, index) => formatErrorRecord(record, index, records.length)).join('\n---\n');
};

const getFallbackErrors = (): string => {
  const buffer = (window as WindowWithErrorBuffer).__errorBuffer;
  if (!buffer) return '';

  const errors = buffer.exportAsText();
  if (!errors || errors === NO_ERRORS_MARKER) return '';

  return errors;
};

const getFallbackErrorCount = (): number => {
  const buffer = (window as WindowWithErrorBuffer).__errorBuffer;
  return buffer?.getAll().length ?? 0;
};

const loadAppErrors = async (): Promise<{ errors: string; count: number }> => {
  try {
    const records = await repositories.logRepository.query({
      level: 'error',
      limit: ERROR_LIMIT,
      offset: 0,
    });

    return {
      errors: formatAppErrors(records),
      count: records.length,
    };
  } catch (error) {
    console.error('Failed to load error logs:', error);
    return { errors: '', count: 0 };
  }
};

const combineErrorLogs = (fallbackErrors: string, appErrors: string): string => {
  const hasFallback = fallbackErrors.length > 0;
  const hasApp = appErrors.length > 0;

  if (!hasFallback && !hasApp) return t('error.no_errors');
  if (!hasFallback) return appErrors;
  if (!hasApp) return fallbackErrors;

  return `=== ${t('error.boot_errors')} ===\n${fallbackErrors}\n\n=== ${t('error.app_errors')} ===\n${appErrors}`;
};

const loadErrorLogs = async (): Promise<void> => {
  const fallbackErrors = getFallbackErrors();
  const { errors: appErrors, count: appErrorCount } = await loadAppErrors();

  errorLog.value = combineErrorLogs(fallbackErrors, appErrors);
  errorCount.value = appErrorCount + getFallbackErrorCount();
};

onMounted(() => {
  loadErrorLogs();
});
</script>

<style scoped lang="scss">
.error-log-card {
  @include fit;

  & {
    overflow-y: auto;
  }
}

pre {
  @include fontify(var(--font-size-sm), var(--font-weight-normal));

  & {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, monospace;
  }
}

.no-errors {
  @include fontify(var(--font-size-base), var(--font-weight-normal), var(--fg-alt));

  & {
    margin: 0;
    font-style: italic;
  }
}
</style>
