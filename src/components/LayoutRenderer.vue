<template>
  <div v-if="layout.type === 'pane'" :data-testid="`pane-${layout.paneId}`" class="layout-pane">
    <slot :pane-id="layout.paneId" />
  </div>
  <app-flex
    v-if="layout.type === 'split'"
    :class="['layout-split', `layout-split--${layout.orientation}`]"
    :direction="layout.orientation === 'horizontal' ? 'row' : 'column'"
    justify="start"
    align="stretch"
    gap="var(--splitter-size)"
  >
    <div v-for="child in layout.children" :key="child.id" class="layout-split-child">
      <LayoutRenderer :layout="child">
        <template #default="{ paneId }">
          <slot :pane-id="paneId" />
        </template>
      </LayoutRenderer>
    </div>
  </app-flex>
</template>

<script lang="ts" setup>
import type { LayoutNode } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

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
  @include fit;
}

.layout-split-child {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
