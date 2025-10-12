<template>
  <div v-if="layout.type === 'pane'" :data-testid="`pane-${layout.paneId}`" class="layout-pane">
    <slot :pane-id="layout.paneId" />
  </div>
  <div
    v-if="layout.type === 'split'"
    :class="['layout-split', `layout-split--${layout.orientation}`]"
  >
    <div v-for="child in layout.children" :key="child.id" class="layout-split-child">
      <LayoutRenderer :layout="child">
        <template #default="{ paneId }">
          <slot :pane-id="paneId" />
        </template>
      </LayoutRenderer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { LayoutNode } from 'orgnote-api';

defineOptions({
  name: 'LayoutRenderer',
});

defineProps<{
  layout: LayoutNode;
}>();

defineSlots<{
  default(props: { paneId: string }): unknown;
}>();
</script>

<style scoped lang="scss">
.layout-pane {
  @include fit;
}

.layout-split {
  @include flexify(row, flex-start, stretch, var(--splitter-size));
  @include fit;
}

.layout-split--horizontal {
  flex-direction: row;
}

.layout-split--vertical {
  flex-direction: column;
}

.layout-split-child {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
