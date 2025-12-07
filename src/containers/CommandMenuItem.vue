<template>
  <menu-item
    @click="execute(props.command)"
    :icon="resolvedIcon"
    :active="command?.isActive?.(api)"
    :narrow="command?.context?.narrow"
  >
    <div class="capitalize text-bold">{{ command?.command ? t(command.command) : '' }}</div>
  </menu-item>
</template>

<script lang="ts" setup>
import { computed, toValue } from 'vue';
import type { CommandName } from 'orgnote-api';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';

const props = defineProps<{
  command: CommandName;
}>();

const { get, execute } = api.core.useCommands();

const command = get(props.command);

const resolvedIcon = computed(() => toValue(command?.icon));

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>
