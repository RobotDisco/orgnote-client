<template>
  <visibility-wrapper>
    <template #desktop-above>
      <nav-tabs>
        <template #navigation>
          <action-button
            icon="keyboard_arrow_left"
            size="sm"
            color="fg-alt"
            :disabled="!canGoBack"
            @click="handleNavigation('back')"
          />
          <action-button
            icon="keyboard_arrow_right"
            size="sm"
            color="fg-alt"
            :disabled="!canGoForward"
            @click="handleNavigation('forward')"
          />
        </template>
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
import ActionButton from 'src/components/ActionButton.vue';
import NavTab from 'src/components/NavTab.vue';
import NavTabs from 'src/components/NavTabs.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import { shallowRef } from 'vue';
import { provide } from 'vue';
import { computed, watch } from 'vue';
import type { Router } from 'vue-router';
import { storeToRefs } from 'pinia';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';

const props = defineProps<{
  paneId: string;
}>();

const pane = api.core.usePane();
const { activeTab } = storeToRefs(pane);
const activePane = pane.getPane(props.paneId);

const tabRouter = shallowRef<Router | null>(null);

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

// Simple history tracking
const historyPosition = shallowRef(0);
const historyLength = shallowRef(1);

// Track navigation position
watch(
  currentRoute,
  (newRoute, oldRoute) => {
    if (newRoute && oldRoute && newRoute.fullPath !== oldRoute.fullPath) {
      historyPosition.value++;
      historyLength.value = historyPosition.value + 1;
    }
  },
  { flush: 'sync' },
);

const canGoBack = computed(() => {
  return tabRouter.value !== null && historyPosition.value > 0;
});

const canGoForward = computed(() => {
  return tabRouter.value !== null && historyPosition.value < historyLength.value - 1;
});

const handleNavigation = (direction: 'back' | 'forward') => {
  try {
    if (!tabRouter.value) {
      api.core.useNotifications().notify({
        message: 'Router not available',
        level: 'danger',
      });
      return;
    }

    if (direction === 'back') {
      tabRouter.value.back();
      historyPosition.value = Math.max(0, historyPosition.value - 1);
    } else {
      tabRouter.value.forward();
      historyPosition.value = Math.min(historyLength.value - 1, historyPosition.value + 1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    api.core.useNotifications().notify({
      message: `Navigation failed: ${errorMessage}`,
      level: 'danger',
    });
  }
};
</script>
