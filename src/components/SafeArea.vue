<template>
  <div class="safe-area" :class="{ enabled, fit }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    enabled?: boolean;
    /* Safe area will occupy 100% width */
    fit?: boolean;
  }>(),
  {
    enabled: true,
    fit: false,
  },
);
</script>

<style lang="scss" scoped>
.safe-area {
  &.enabled {
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  &.fit {
    @include fit;
  }

  & {
    min-height: 0;
    padding-bottom: env(safe-area-inset-bottom);
    box-sizing: border-box;
  }
}
</style>
