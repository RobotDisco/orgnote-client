<template>
  <div class="theme-variant" :class="variant">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import type { StyleVariant } from 'orgnote-api';

defineProps<{
  variant?: StyleVariant;
}>();
</script>

<style lang="scss">
.theme-variant {
  &.plain {
    --variant-color: var(--fg);
    --variant-color-muted: var(--fg-alt);
  }

  @include for-each-view-type using ($type, $color) {
    &.#{$type} {
      --variant-color: #{$color};
      --variant-color-muted: color-mix(in srgb, #{$color}, var(--fg-alt) 50%);
    }
  }

  &.active {
    --variant-color: var(--accent);
    --variant-color-muted: color-mix(in srgb, var(--accent), var(--fg-alt) 50%);
  }

  &.clear {
    --variant-color: var(--fg);
    --variant-color-muted: var(--fg-alt);
  }
}
</style>
