<template>
  <div class="task-wrapper">
    <app-spoiler>
      <template #title>
        <app-flex direction="row">
          <app-flex gap="md">
            <app-icon
              :name="getStatusIcon(task.status)"
              :color="getStatusColor(task.status)"
              size="sm"
            />

            <monochrome-face>
              {{ task.id }}
              <template v-if="task.retries"> ({{ task.retries }} {{ $t(i18n.RETRIES) }}) </template>
            </monochrome-face>

            <app-badge :color="getStatusColor(task.status)" size="xs">
              {{ task.status }}
            </app-badge>
          </app-flex>
          <app-flex gap="md">
            <app-date v-if="task.added" :date="task.added" format="time" />
            <action-button
              v-if="isCancellable"
              size="sm"
              color="red"
              outline
              border
              icon="sym_o_cancel"
              @click.stop="$emit('cancel', task.id)"
            />
          </app-flex>
        </app-flex>
      </template>
      <template #body>
        <span v-if="task.error">{{ $t(i18n.ERROR) }}:</span>
        <log-entry :log="log" minimal />
      </template>
    </app-spoiler>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { i18n, type LogRecord, type QueueTask, type ThemeVariable } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppBadge from './AppBadge.vue';
import AppDate from './AppDate.vue';
import AppSpoiler from './AppSpoiler.vue';
import LogEntry from './LogEntry.vue';
import AppFlex from './AppFlex.vue';
import MonochromeFace from './MonochromeFace.vue';
import ActionButton from './ActionButton.vue';

const props = defineProps<{
  task: QueueTask;
}>();

defineEmits<{
  (e: 'cancel', taskId: string): void;
}>();

const statusIcons: Record<string, string> = {
  completed: 'sym_o_check_circle',
  failed: 'sym_o_error',
  processing: 'sym_o_sync',
  pending: 'sym_o_hourglass_empty',
  canceled: 'sym_o_cancel',
};

const statusColors: Record<string, ThemeVariable> = {
  completed: 'green',
  failed: 'red',
  processing: 'blue',
  pending: 'orange',
  canceled: 'red',
};

const getStatusIcon = (status: string = '') => {
  return statusIcons[status] ?? 'sym_o_help';
};

const getStatusColor = (status: string = ''): ThemeVariable => {
  return statusColors[status] ?? 'fg-alt';
};

const nonCancellableStatuses = ['completed', 'failed', 'canceled'];

const isCancellable = computed(() => {
  const { status } = props.task;
  return status && !nonCancellableStatuses.includes(status);
});

const log = computed<LogRecord>(() => {
  const { task } = props;
  const hasError = Boolean(task.error);
  const tsSource = (task.updated ?? task.added) as number | undefined;

  return {
    level: hasError ? 'error' : 'info',
    message: hasError
      ? typeof task.error === 'string'
        ? task.error
        : JSON.stringify(task.error)
      : JSON.stringify(task),
    ts: tsSource ? new Date(tsSource) : new Date(),
    context: hasError ? { task } : undefined,
  };
});
</script>
