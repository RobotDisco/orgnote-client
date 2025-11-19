<template>
  <div class="page" :class="{ padding, constrained }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  padding?: boolean;
  constrained?: boolean;
}>();
</script>

<style lang="scss" scoped>
.page {
  @include fit();
  @include flexify(column, flex-start, flex-start);

  & {
    background: var(--bg);
    padding-bottom: var(--footer-height);
  }

  &.padding {
    padding: var(--page-padding);
    padding-top: calc(var(--page-padding) + env(safe-area-inset-top));
  }

  &.constrained {
    max-width: var(--page-max-width);
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
