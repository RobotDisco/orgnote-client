<template>
  <div class="header-wrapper" :style="paddingStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StyleSize } from 'orgnote-api';

const props = withDefaults(
  defineProps<{
    padding?: StyleSize;
  }>(),
  {
    padding: 'md',
  },
);

const paddingStyle = computed(() => ({
  padding: `var(--padding-${props.padding})`,
}));
</script>

<style scoped lang="scss">
.header-wrapper {
  @include flexify(row, left, center, var(--gap-md));

  @include desktop-below {
    padding-top: var(--padding-sm);
    padding-bottom: var(--padding-sm);
  }
}
</style>
