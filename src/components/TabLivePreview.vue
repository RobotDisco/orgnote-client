<template>
  <div class="tab-preview" :class="{ active }" @click="$emit('select')">
    <div class="preview-overlay">
      <div class="tab-title">{{ title }}</div>
      <action-button
        icon="sym_o_close"
        size="sm"
        color="bg"
        @click.stop="$emit('close')"
        outline
        hover-color="violet"
      />
    </div>
    <ScopedRouterView v-if="tab.router" :router="tab.router" class="scaled-router-view" />
  </div>
</template>

<script setup lang="ts">
import type { Tab } from 'orgnote-api';
import ScopedRouterView from 'src/components/ScopedRouterView.vue';
import { provide, shallowRef, computed } from 'vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import ActionButton from './ActionButton.vue';

const props = defineProps<{
  tab: Tab;
  active?: boolean;
}>();

const tabRouter = shallowRef(props.tab.router);
provide(TAB_ROUTER_KEY, tabRouter);

const title = computed(() => {
  return generateTabTitle(props.tab.router.currentRoute.value) || props.tab.title;
});

defineEmits<{
  select: [];
  close: [];
}>();
</script>

<style lang="scss" scoped>
.tab-preview {
  border: var(--tab-preview-border);
  border-radius: var(--border-radius-lg);
  background: var(--bg);
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-md);

  &.active {
    border: var(--tab-preview-active-border);
  }
}

.scaled-router-view {
  transform: scale(0.25);
  transform-origin: top left;
  width: 400%;
  height: 400%;
  pointer-events: none;
  position: absolute;
}

.preview-overlay {
  @include flexify(row, space-between, center);
  width: 100%;

  position: absolute;
  height: var(--tab-preview-header-height);
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
  z-index: 10;
  padding: var(--tab-preview-overlay-padding);
}

.tab-title {
  @include line-limit(1);

  color: var(--bg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  flex: 1;
  margin-right: var(--margin-sm);
}
</style>
