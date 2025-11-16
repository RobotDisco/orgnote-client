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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppButton from 'src/components/AppButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import PageWrapper from 'src/components/PageWrapper.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import InfoCard from 'src/components/InfoCard.vue';
import AppCard from 'src/components/AppCard.vue';
import { api } from 'src/boot/api';

interface ErrorBuffer {
  exportAsText: () => string;
  getAll: () => unknown[];
}

type WindowWithErrorBuffer = Window & { __errorBuffer?: ErrorBuffer };

const NO_ERRORS_MARKER = 'No errors recorded';

const { t } = useI18n();
const logStore = api.core.useLog();

const reload = (): void => {
  window.location.assign('/');
};

const getFallbackErrors = (): string => {
  const buffer = (window as WindowWithErrorBuffer).__errorBuffer;
  if (!buffer) return '';

  const errors = buffer.exportAsText();
  if (!errors || errors === NO_ERRORS_MARKER) return '';

  return errors;
};

const combineErrorLogs = (fallbackErrors: string, storeErrors: string): string => {
  const hasFallback = fallbackErrors.length > 0;
  const hasStore = storeErrors.length > 0;

  if (!hasFallback && !hasStore) return t('error.no_errors');
  if (!hasFallback) return storeErrors;
  if (!hasStore) return fallbackErrors;

  return `=== ${t('error.boot_errors')} ===\n${fallbackErrors}\n\n=== ${t('error.app_errors')} ===\n${storeErrors}`;
};

const errorLog = computed(() => {
  const fallbackErrors = getFallbackErrors();
  const storeErrors = logStore.exportAsText();
  return combineErrorLogs(fallbackErrors, storeErrors);
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
