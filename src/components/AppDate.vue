<template>
  <span class="app-date" :class="{ monospace }">
    {{ formattedDate }}
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    date: Date | number | string;
    format?: 'date' | 'time' | 'datetime' | 'iso';
    monospace?: boolean;
  }>(),
  {
    format: 'datetime',
    monospace: false,
  },
);

const dateObj = computed(() => new Date(props.date));

const formattedDate = computed(() => {
  const d = dateObj.value;
  if (isNaN(d.getTime())) return 'Invalid Date';

  const formatters = {
    time: () => d.toLocaleTimeString(),
    date: () => d.toLocaleDateString(),
    iso: () => d.toISOString(),
    datetime: () => d.toLocaleString(),
  };

  return formatters[props.format ?? 'datetime']();
});
</script>

<style lang="scss" scoped>
.app-date {
  @include fontify(var(--font-size-xs), normal, var(--fg-muted));

  &.monospace {
    font-family: var(--code-font-family);
  }
}
</style>
