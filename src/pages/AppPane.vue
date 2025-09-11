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
  <ScopedRouterView v-if="resolvedRouter" :router="resolvedRouter" />
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
import ScopedRouterView from 'src/components/ScopedRouterView.vue';
import { storeToRefs } from 'pinia';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';

const props = defineProps<{
  paneId: string;
}>();

const pane = api.core.usePane();
const { activeTab } = storeToRefs(pane);
const activePane = pane.getPane(props.paneId);

const tabRouter = shallowRef<Router | null>(null);
const resolvedRouter = computed(() => tabRouter.value as Router | null);

const initTabRouter = () => {
  tabRouter.value = activeTab.value.router;
};

initTabRouter();

watch(activeTab, initTabRouter);

provide(TAB_ROUTER_KEY, tabRouter);

const currentRoute = computed(() => tabRouter.value?.currentRoute.value);

// Per-tab route history tracking
const routeHistory = shallowRef<string[]>([]);
const historyIndex = shallowRef(-1);

const initHistory = () => {
  const full = tabRouter.value?.currentRoute.value.fullPath;
  if (!full) return;
  routeHistory.value = [full];
  historyIndex.value = 0;
};

initHistory();
watch(activeTab, initHistory);

watch(
  currentRoute,
  (newRoute, oldRoute) => {
    if (!newRoute || !oldRoute) return;
    if (newRoute.fullPath === oldRoute.fullPath) return;

    const hist = routeHistory.value;
    const idx = historyIndex.value;
    const prev = idx > 0 ? hist[idx - 1] : null;
    if (prev === newRoute.fullPath) {
      historyIndex.value = idx - 1;
      return;
    }
    const next = idx < hist.length - 1 ? hist[idx + 1] : null;
    if (next === newRoute.fullPath) {
      historyIndex.value = idx + 1;
      return;
    }

    routeHistory.value = hist.slice(0, idx + 1).concat(newRoute.fullPath);
    historyIndex.value = idx + 1;
  },
  { flush: 'sync' },
);

const canGoBack = computed(() => {
  return tabRouter.value !== null && historyIndex.value > 0;
});

const canGoForward = computed(() => {
  return tabRouter.value !== null && historyIndex.value < routeHistory.value.length - 1;
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
      if (!canGoBack.value) return;
      tabRouter.value.back();
      return;
    }
    if (!canGoForward.value) return;
    tabRouter.value.forward();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    api.core.useNotifications().notify({
      message: `Navigation failed: ${errorMessage}`,
      level: 'danger',
    });
  }
};
</script>
