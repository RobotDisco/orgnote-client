<template>
  <div class="pane-container">
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
            v-for="tab of Object.values(activePane.tabs.value)"
            @click="pane.selectTab(activePane.id, tab.id)"
            @close="pane.closeTab(activePane.id, tab.id)"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            icon="description"
            :key="tab.id"
            :active="tab.id === activePane.activeTabId"
            :tab-id="tab.id"
            :pane-id="activePane.id"
          >
            {{ generateTabTitle(tab.router.currentRoute.value) || tab.title }}
          </nav-tab>
          <template #actions>
            <command-action-button :command="DefaultCommands.NEW_TAB" size="sm" />
          </template>
        </nav-tabs>
      </template>
      <template #mobile-only>
        <div class="mobile-tab-header">
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
          <div class="mobile-tab-title">
            {{ generateTabTitle(activeTab?.router.currentRoute.value) || activeTab?.title }}
          </div>
          <command-action-button :command="DefaultCommands.SHOW_TAB_SWITCHER" size="sm" />
          <command-action-button :command="DefaultCommands.NEW_TAB" size="sm" />
        </div>
      </template>
    </visibility-wrapper>
    <ScopedRouterView
      v-if="resolvedRouter"
      :router="resolvedRouter"
      :key="activePane.activeTabId"
    />
    <drop-zone-overlay
      :visible="pane.isDraggingTab"
      v-model:active-zone="currentDropZone"
      @drop="handleDrop"
    />
  </div>
</template>

<script lang="ts" setup>
import { DefaultCommands, type DropDirection, type DropZone } from 'orgnote-api';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import NavTab from 'src/components/NavTab.vue';
import NavTabs from 'src/components/NavTabs.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import DropZoneOverlay from 'src/components/DropZoneOverlay.vue';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import { generateTabTitle } from 'src/utils/generate-tab-title';
import { shallowRef, ref } from 'vue';
import { provide } from 'vue';
import { computed, watch } from 'vue';
import type { Router } from 'vue-router';

import ScopedRouterView from 'src/components/ScopedRouterView.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';

const props = defineProps<{
  paneId: string;
}>();

const pane = api.core.usePane() as ReturnType<typeof api.core.usePane> & {
  isDraggingTab: boolean;
  draggedTabData: { tabId: string; paneId: string } | null;
  startDraggingTab: (tabId: string, paneId: string) => void;
  stopDraggingTab: () => void;
  splitPaneInLayout: (
    paneId: string,
    direction: DropDirection,
    createInitialTab?: boolean,
  ) => Promise<string | null>;
};
const activePane = pane.getPane(props.paneId);

const activeTab = computed(() => {
  const tabId = activePane.value.activeTabId;
  if (!tabId) return null;
  return activePane.value.tabs.value[tabId] || null;
});

const currentDropZone = ref<DropZone | null>(null);

const tabRouter = shallowRef<Router | null>(null);
const resolvedRouter = computed(() => tabRouter.value as Router | null);

const initTabRouter = () => {
  const tab = activeTab.value;
  if (!tab) return;
  tabRouter.value = tab.router;
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

const handleDragStart = (payload: { tabId: string; paneId: string }) => {
  setTimeout(() => {
    pane.startDraggingTab(payload.tabId, payload.paneId);
  }, 0);
};

const handleDragEnd = () => {
  pane.stopDraggingTab();
  currentDropZone.value = null;
};

const handleDrop = async (zone: DropZone) => {
  if (!pane.draggedTabData) return;

  const { tabId, paneId: sourcePaneId } = pane.draggedTabData;

  if (zone === 'center') {
    if (sourcePaneId !== props.paneId) {
      pane.moveTab(tabId, sourcePaneId, props.paneId);
    }
    handleDragEnd();
    return;
  }

  const direction = zone as DropDirection;
  const newPaneId = await pane.splitPaneInLayout(props.paneId, direction, false);
  if (!newPaneId) {
    handleDragEnd();
    return;
  }

  pane.moveTab(tabId, sourcePaneId, newPaneId);
  handleDragEnd();
};
</script>

<style scoped>
.pane-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.mobile-tab-header {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: var(--padding-sm) var(--padding-md);
  background: var(--bg);
  border-bottom: 1px solid var(--border-color);
}

.mobile-tab-title {
  flex: 1;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--fg);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
