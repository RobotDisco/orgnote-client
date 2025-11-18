<template>
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
</template>

<script setup lang="ts">
import AppCard from 'src/components/AppCard.vue';
import LogEntry from 'src/components/LogEntry.vue';
import { useAppLogs } from 'src/composables/useAppLogs';
import { I18N } from 'orgnote-api';

const { fallbackErrors, hasFallbackErrors, storeLogs, hasStoreLogs } = useAppLogs();
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
