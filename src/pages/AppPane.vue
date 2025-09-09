<template>
  <visibility-wrapper>
    <template #desktop-above>
      <nav-tabs>
        <nav-tab
          v-for="(tab, i) of Object.values(activePane.tabs.value)"
          @click="pane.selectTab(activePane.id, tab.id)"
          @close="pane.closeTab(activePane.id, tab.id)"
          icon="description"
          :key="i"
          :active="tab.id === activePane.activeTabId"
        >
          {{ generateTabTitle(tab.router.currentRoute.value) || tab.title }}
        </nav-tab>
        <template #actions>
          <command-action-button :command="DefaultCommands.NEW_TAB" size="sm" />
        </template>
      </nav-tabs>
    </template>
  </visibility-wrapper>
  <component :is="currentView" />
</template>

<script lang="ts" setup>
import { DefaultCommands } from 'orgnote-api';
import { api } from 'src/boot/api';
import NavTab from 'src/components/NavTab.vue';
import NavTabs from 'src/components/NavTabs.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import { shallowRef } from 'vue';
import { provide } from 'vue';
import { computed, watch } from 'vue';
import type { Router } from 'vue-router';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  paneId: string;
}>();

const pane = api.core.usePane();
const { activeTab } = storeToRefs(pane);
const activePane = pane.getPane(props.paneId);

const tabRouter = shallowRef<Router>(null);

const initTabRouter = () => {
  tabRouter.value = activeTab.value.router;
};

initTabRouter();

watch(activeTab, initTabRouter);

provide(TAB_ROUTER_KEY, tabRouter);

const currentRoute = computed(() => tabRouter.value?.currentRoute.value);

const currentView = computed(() => {
  return currentRoute.value?.matched[0]?.components?.default;
});
</script>
