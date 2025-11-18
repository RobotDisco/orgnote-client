<template>
  <div class="log-entry" :class="log.level" @click="handleClick">
    <div class="header">
      <span class="number">[{{ position }}]</span>
      <span class="timestamp">{{ formattedTimestamp }}</span>
      <span class="level">{{ log.level.toUpperCase() }}</span>
      <span v-if="hasRepeats" class="repeat">×{{ log.repeatCount }}</span>
    </div>

    <div class="message">
      <pre v-if="isObjectMessage">{{ formattedMessage }}</pre>
      <template v-else>{{ formattedMessage }}</template>
    </div>

    <div v-if="hasStack" class="stack">
      <hr />
      <div class="label">Stack:</div>
      <pre>{{ log.context?.stack }}</pre>
    </div>

    <div v-if="hasContext" class="context">
      <hr />
      <div class="label">Context:</div>
      <pre>{{ formattedContext }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LogRecord } from 'orgnote-api';
import { copyToClipboard } from 'src/utils/clipboard';
import { api } from 'src/boot/api';

interface Props {
  log: LogRecord;
  position: number;
}

const props = defineProps<Props>();

const formattedTimestamp = computed(() => {
  const timestamp = props.log.ts instanceof Date ? props.log.ts : new Date(props.log.ts);
  return timestamp.toISOString();
});

const isObjectMessage = computed(() => {
  const msg = props.log.message;
  if (typeof msg !== 'string') return false;

  try {
    JSON.parse(msg);
    return msg.startsWith('{') || msg.startsWith('[');
  } catch {
    return false;
  }
});

const formattedMessage = computed(() => {
  const msg = props.log.message;

  if (isObjectMessage.value) {
    try {
      const parsed = JSON.parse(msg);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return msg;
    }
  }

  return msg;
});

const extractContext = (context?: Record<string, unknown>): Record<string, unknown> => {
  if (!context) return {};
  const contextCopy = { ...context };
  delete contextCopy.stack;
  delete contextCopy.cause;
  return contextCopy;
};

const hasStack = computed(() => Boolean(props.log.context?.stack));

const hasContext = computed(() => {
  const ctx = extractContext(props.log.context);
  return Object.keys(ctx).length > 0;
});

const hasRepeats = computed(() => (props.log.repeatCount ?? 1) > 1);

const formattedContext = computed(() => {
  const ctx = extractContext(props.log.context);
  return JSON.stringify(ctx, null, 2);
});

const formatLogAsText = (): string => {
  const parts: string[] = [];
  const timestamp = props.log.ts instanceof Date ? props.log.ts : new Date(props.log.ts);

  parts.push(`[${props.position}] ${timestamp.toISOString()}`);

  if (props.log.context?.stack) {
    parts.push(String(props.log.context.stack));
  } else {
    parts.push(formattedMessage.value);
  }

  if (hasRepeats.value) {
    parts.push(`Repeat count: ${props.log.repeatCount ?? 1}`);
    if (props.log.firstTs && props.log.lastTs) {
      parts.push(
        `First occurrence: ${new Date(props.log.firstTs).toISOString()}`,
        `Last occurrence: ${new Date(props.log.lastTs).toISOString()}`,
      );
    }
  }

  if (hasContext.value) {
    parts.push(`Context: ${formattedContext.value}`);
  }

  return parts.join('\n');
};

const handleClick = async (): Promise<void> => {
  const text = formatLogAsText();
  await copyToClipboard(text);
  api.core.useNotifications().notify({
    message: 'Log copied to clipboard',
    level: 'info',
    timeout: 2000,
  });
};
</script>

<style scoped lang="scss">
$level-colors: (
  error: var(--red),
  warn: var(--yellow),
  info: var(--blue),
  debug: var(--fg),
  trace: var(--fg),
);

.log-entry {
  padding: var(--padding-lg);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--margin-sm);
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  @each $level, $color in $level-colors {
    &.#{$level}:hover {
      background: color-mix(in srgb, $color, transparent 95%);
    }
  }
}

.header {
  @include flexify(row, flex-start, center, var(--gap-sm));

  & {
    margin-bottom: var(--margin-md);
  }
}

.number {
  @include fontify(var(--font-size-xs), var(--font-weight-bold), var(--fg));
}

.timestamp {
  @include fontify(var(--font-size-xs), var(--font-weight-normal), var(--fg));

  & {
    font-family: ui-monospace, monospace;
  }
}

.level {
  @include fontify(var(--font-size-xs), var(--font-weight-bold));

  & {
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
  }

  @each $level, $color in $level-colors {
    .#{$level} & {
      color: $color;
      background: color-mix(in srgb, $color, transparent 85%);
    }
  }
}

.repeat {
  @include fontify(var(--font-size-xs), var(--font-weight-bold), var(--fg));

  & {
    margin-left: auto;
    padding: 0 var(--padding-md);
    border-radius: var(--border-radius-sm);
    background: var(--border-default);
  }
}

.message {
  @include fontify(var(--font-size-base), var(--font-weight-normal), var(--fg));

  & {
    margin-bottom: var(--margin-xs);
    word-break: break-word;
  }

  pre {
    @include fontify(var(--font-size-sm), var(--font-weight-normal), var(--fg));

    & {
      margin: 0;
      padding: var(--padding-xs);
      background: transparent;
      border-radius: var(--border-radius-sm);
      overflow-x: auto;
      font-family: ui-monospace, monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}

.stack,
.context {
  margin-top: var(--margin-xs);
}

.label {
  @include fontify(var(--font-size-sm), var(--font-weight-bold), var(--fg));

  & {
    display: block;
    padding: var(--padding-md);
  }
}

.stack pre,
.context pre {
  @include fontify(var(--font-size-sm), var(--font-weight-normal), var(--fg));

  & {
    margin: 0;
    padding: var(--padding-xs);
    background: transparent;
    border-radius: var(--border-radius-sm);
    overflow-x: auto;
    font-family: ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
