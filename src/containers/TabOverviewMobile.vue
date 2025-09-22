<template>
  <PageWrapper>
    <div class="tab-grid-container">
      <div class="tab-grid">
        <TabLivePreview
          v-for="tab in allTabs"
          :key="tab.id"
          :tab="tab"
          :active="tab.id === activeTab?.id"
          @select="selectTab(tab)"
          @close="closeTab(tab)"
        />
      </div>
    </div>
    <app-footer>
      <command-action-button :command="DefaultCommands.NEW_TAB" include-text />
      <command-action-button :command="DefaultCommands.CLOSE_MODAL" include-text text="Close" />
    </app-footer>
  </PageWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { api } from 'src/boot/api';
import TabLivePreview from 'src/components/TabLivePreview.vue';
import PageWrapper from 'src/components/PageWrapper.vue';
import AppFooter from 'src/components/AppFooter.vue';
import { DefaultCommands, type Tab } from 'orgnote-api';
import CommandActionButton from './CommandActionButton.vue';
import { storeToRefs } from 'pinia';

const paneStore = api.core.usePane();
const { activeTab } = storeToRefs(paneStore);

const emits = defineEmits<{
  (e: 'selected', tab: Tab): void;
}>();

const allTabs = computed(() => {
  const panes = Object.values(paneStore.panes);
  return panes.flatMap((paneRef) => Object.values(paneRef.value.tabs.value));
});

const selectTab = (tab: Tab) => {
  if (!tab.paneId) return;
  paneStore.selectTab(tab.paneId, tab.id);
  emits('selected', tab);
};

const closeTab = (tab: Tab) => {
  if (!tab.paneId) return;

  paneStore.closeTab(tab.paneId, tab.id);
};
</script>

<style lang="scss" scoped>
.tab-grid-container {
  @include fit;
  padding: var(--tab-overview-container-padding);
  flex: 1;
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-lg);
  min-height: 60vh;
  text-align: center;
}

.empty-text {
  font-size: var(--font-size-lg);
  color: var(--fg-alt);
}

.tab-grid {
  display: grid;
  grid-template-columns: repeat(var(--tab-overview-grid-columns), 1fr);
  gap: var(--tab-overview-grid-gap);
}
</style>
