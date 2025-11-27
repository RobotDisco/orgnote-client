<template>
  <div class="layout" :class="{ reverse }" :style="layoutStyles">
    <div v-if="slots.header" class="layout-header" :class="{ border: headerBorder }">
      <slot name="header" />
    </div>
    <div class="layout-body" :class="{ scroll: bodyScroll }">
      <slot name="body" />
      <slot />
    </div>
    <div v-if="slots.footer" class="layout-footer" :class="{ border: footerBorder }">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import type { StyleSize } from 'orgnote-api';

const props = withDefaults(
  defineProps<{
    gap?: StyleSize;
    bodyScroll?: boolean;
    reverse?: boolean;
    headerBorder?: boolean;
    footerBorder?: boolean;
  }>(),
  {
    bodyScroll: true,
    reverse: false,
    headerBorder: false,
    footerBorder: false,
  },
);

const slots = useSlots();

const layoutStyles = computed(() =>
  props.gap ? { '--layout-gap': `var(--gap-${props.gap})` } : {},
);
</script>

<style scoped lang="scss">
.layout {
  @include flexify(column, flex-start, stretch, var(--layout-gap));

  & {
    @include fit;
  }
}

.layout-header,
.layout-footer {
  flex-shrink: 0;
}

.layout-header.border {
  border-bottom: var(--border-default);
}

.layout-footer.border {
  border-top: var(--border-default);
}

.layout-body {
  flex: 1;
  min-height: 0;

  &.scroll {
    overflow-y: auto;
  }
}

.layout.reverse {
  .layout-header {
    order: 2;

    &.border {
      border-bottom: none;
      border-top: var(--border-default);
    }
  }

  .layout-body {
    order: 1;
  }

  .layout-footer {
    order: 0;

    &.border {
      border-top: none;
    }
  }
}
</style>
