<template>
  <page-wrapper padding constrained>
    <container-layout gap="lg" :body-scroll="false">
      <template #header>
        <info-card
          icon="sym_o_error"
          :title="$t(I18N.CRITICAL_ERROR)"
          :description="$t(I18N.ERROR_DESCRIPTION)"
          type="danger"
        />
      </template>

      <app-card class="error-log-card">
        <div v-if="hasFallbackErrors" class="fallback-errors">
          <h3 class="section-title">{{ $t(I18N.BOOT_ERRORS) }}</h3>
          <pre class="fallback-text">{{ fallbackErrors }}</pre>
        </div>

        <div v-if="hasStoreLogs" class="store-errors">
          <h3 v-if="hasFallbackErrors" class="section-title">{{ $t(I18N.APP_ERRORS) }}</h3>
          <div class="log-list">
            <log-entry
              v-for="(log, index) in storeLogs"
              :key="index"
              :log="log"
              :position="storeLogs.length - index"
            />
          </div>
        </div>

        <p v-if="!hasFallbackErrors && !hasStoreLogs" class="no-errors">
          {{ $t(I18N.NO_ERRORS) }}
        </p>
      </app-card>

      <template #footer>
        <app-card>
          <action-buttons position="right">
            <action-button icon="content_copy" fire-icon="check" :copy-text="errorLogText" border>
              <template #text>{{ $t(I18N.COPY_LOG) }}</template>
            </action-button>
            <app-button @click="reload" type="danger">{{ $t(I18N.RELOAD) }}</app-button>
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
import LogEntry from 'src/components/LogEntry.vue';
import { api } from 'src/boot/api';
import { I18N } from 'orgnote-api';

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
</script>

<style scoped lang="scss">
.error-log-card {
  @include fit;

  & {
    overflow-y: auto;
  }
}

.fallback-errors,
.store-errors {
  margin-bottom: var(--margin-lg);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  @include fontify(var(--font-size-lg), var(--font-weight-bold), var(--fg));

  & {
    margin: 0 0 var(--margin-md) 0;
    padding-bottom: var(--padding-xs);
    border-bottom: 2px solid var(--border-default);
  }
}

.fallback-text {
  @include fontify(var(--font-size-sm), var(--font-weight-normal));

  & {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, monospace;
  }
}

.log-list {
  display: flex;
  flex-direction: column;
}

.no-errors {
  @include fontify(var(--font-size-base), var(--font-weight-normal), var(--fg-alt));

  & {
    margin: 0;
    font-style: italic;
    text-align: center;
    padding: var(--padding-lg);
  }
}
</style>
