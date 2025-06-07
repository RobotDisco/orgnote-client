import type { InitialPaneParams, Tab, Pane } from 'orgnote-api';
import { RouteNames, type PaneStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { UNTITLED_PAGE } from 'src/constants/untitled-page';
import { v4 } from 'uuid';
import type { ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';
import type { RouteLocationRaw, Router } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';

export const initPaneRouter = async (tabId: string): Promise<Router> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:paneId',
        name: RouteNames.InitialPage,
        component: () => import('src/pages/InitialPage.vue'),
      },
      {
        path: '/:paneId/edit-note/:path',
        name: RouteNames.EditNote,
        component: () => import('src/pages/EditNote.vue'),
      },
    ],
  });
  await router.push({ name: RouteNames.InitialPage, params: { paneId: tabId } });
  return router;
};

// TODO: feat/stable-beta check, isn't it more easy to use reactive properties instead of multiple nested shallowRef?
// We already know this structure... probably it could be more convenient
export const usePaneStore = defineStore<'panes', PaneStore>(
  'panes',
  () => {
    const panes = shallowRef<Record<string, ShallowRef<Pane>>>({});
    const activePaneId = shallowRef<string | null>(null);

    const activePane = computed(() =>
      activePaneId.value ? panes.value[activePaneId.value].value : undefined,
    );

    const initNewTab = async (
      params?: Partial<Pick<Tab, 'title' | 'id' | 'paneId'>>,
    ): Promise<Tab> => {
      const id = params?.id || v4();
      const router = await initPaneRouter(id);

      const newTab = {
        title: params?.title || UNTITLED_PAGE,
        paneId: params?.paneId ?? activePaneId.value,
        router,
        id,
      };

      return newTab;
    };

    const initNewPane = async (params: InitialPaneParams = {}): Promise<Pane> => {
      const paneId = params.paneId ?? v4();
      const newPage = await initNewTab({ ...params, paneId });

      const pane = shallowRef<Pane>({
        id: paneId,
        activeTabId: newPage.id,
        tabs: shallowRef({
          [newPage.id]: newPage,
        }),
      });

      activePaneId.value = paneId;
      panes.value = {
        ...panes.value,
        [paneId]: pane,
      };

      return pane.value;
    };

    const getPane = (id: string): ShallowRef<Pane | undefined> => panes.value[id];

    const addTab = async (params: InitialPaneParams = {}) => {
      if (!activePaneId.value) return null;

      const tab = await initNewTab(params);
      const currentPane = panes.value[activePaneId.value];

      if (!currentPane) return null;

      panes.value[activePaneId.value].value.tabs.value = {
        ...panes.value[activePaneId.value].value.tabs.value,
        [tab.id]: tab,
      };

      return tab;
    };

    const selectTab = (paneId: string, pageId: string) => {
      if (!panes.value[paneId] || !panes.value[paneId].value.tabs.value[pageId]) return;

      activePaneId.value = paneId;

      panes.value[paneId].value = {
        ...panes.value[paneId].value,
        activeTabId: pageId,
      };
    };

    const closeTab = (paneId: string, tabId: string) => {
      const pane = panes.value[paneId];
      if (!pane || !pane.value.tabs.value[tabId]) return;

      delete pane.value.tabs.value[tabId];

      const pageIds = Object.keys(pane.value.tabs.value[tabId]);
      if (pageIds.length === 0) {
        const newPanes = { ...panes.value };
        delete newPanes[paneId];
        panes.value = newPanes;

        if (activePaneId.value === paneId) {
          const remainingPaneIds = Object.keys(newPanes);
          activePaneId.value = remainingPaneIds.length ? remainingPaneIds[0] : null;
        }
        return;
      }

      const newActiveTabId = pane.value.activeTabId === tabId ? pageIds[0] : pane.value.activeTabId;

      panes.value[paneId].value = {
        ...panes.value[paneId].value,
        activeTabId: newActiveTabId,
      };
    };

    const activeTab = computed(() =>
      activePane.value?.activeTabId
        ? activePane.value.tabs.value[activePane.value.activeTabId]
        : undefined,
    );

    const navigateTab = (paneId: string, tabId: string, params: RouteLocationRaw) => {
      const pane = panes.value[paneId];
      const tab = pane.value?.tabs.value[tabId];
      if (!tab?.router) return;

      const routeParams: RouteLocationRaw =
        typeof params === 'string'
          ? { path: params }
          : 'name' in params
            ? { ...params, params: { ...('params' in params ? params.params : {}), paneId } }
            : params;

      return tab.router.push(routeParams);
    };

    const navigate = (params: RouteLocationRaw) => {
      if (!activePaneId.value || !activeTab.value) return;
      return navigateTab(activePaneId.value, activeTab.value.id, params);
    };

    const paneStore: PaneStore = {
      panes,
      activePane,
      initNewPane,
      getPane,
      activePaneId,
      addTab,
      selectTab,
      closeTab,
      activeTab,
      navigateTab,
      navigate,
    };

    return paneStore;
  },
  { persist: true },
);
