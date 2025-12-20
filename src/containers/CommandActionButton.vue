<template>
  <action-button
    v-if="command && !command.hide?.(api)"
    @click="execute"
    :icon="iconString"
    :size="size"
    classes="action-btn"
    :alignment="alignment"
  >
    <template v-if="iconComponent" #icon="{ size: iconSize }">
      <component :is="iconComponent" :size="iconSize" />
    </template>
    <template v-if="includeText || text" #text>{{
      text || camelCaseToWords(command.command)
    }}</template>
  </action-button>
</template>

<script lang="ts" setup>
import ActionButton, { type ButtonAlignment } from 'src/components/ActionButton.vue';
import type { CommandIcon, CommandName, StyleSize } from 'orgnote-api';
import { useCommandsStore } from 'src/stores/command';
import { computed, toValue } from 'vue';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { api } from 'src/boot/api';

const props = withDefaults(
  defineProps<{
    command: CommandName;
    alignment?: ButtonAlignment;
    size?: StyleSize;
    includeText?: boolean;
    text?: string;
    data?: unknown;
  }>(),
  {
    size: 'md',
    alignment: 'center',
  },
);

const commandsStore = useCommandsStore();

const command = computed(() => commandsStore.get(props.command));

const resolvedIcon = computed<CommandIcon | undefined>(() => toValue(command.value?.icon));

const iconString = computed(() =>
  typeof resolvedIcon.value === 'string' ? resolvedIcon.value : undefined,
);

const iconComponent = computed(() =>
  resolvedIcon.value && typeof resolvedIcon.value !== 'string' ? resolvedIcon.value : undefined,
);

const execute = () => {
  commandsStore.execute(props.command, props.data);
};
</script>
