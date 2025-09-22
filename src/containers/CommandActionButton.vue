<template>
  <action-button
    @click="execute"
    v-if="command && !command.hide?.(api)"
    :icon="extractDynamicValue(command.icon)"
    :size="size"
    classes="action-btn"
  >
    <template v-if="includeText || text" #text>{{
      text || camelCaseToWords(command.command)
    }}</template>
  </action-button>
</template>

<script lang="ts" setup>
import ActionButton from 'src/components/ActionButton.vue';
import type { CommandName, StyleSize } from 'orgnote-api';
import { useCommandsStore } from 'src/stores/command';
import { computed } from 'vue';
import { extractDynamicValue } from 'src/utils/extract-dynamic-value';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { api } from 'src/boot/api';

const props = withDefaults(
  defineProps<{
    command: CommandName;
    size?: StyleSize;
    includeText?: boolean;
    text?: string;
    data?: unknown;
  }>(),
  {
    size: 'md',
  },
);

const commandsStore = useCommandsStore();

const command = computed(() => commandsStore.get(props.command));

const execute = () => {
  commandsStore.execute(props.command, props.data);
};
</script>
