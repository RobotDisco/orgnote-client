import type {
  InitialPaneParams,
  Tab,
  Pane,
  PanesSnapshot,
  PaneSnapshot,
  TabSnapshot,
} from 'orgnote-api';
import { RouteNames, type PaneStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { getUniqueTabTitle } from 'src/utils/unique-tab-title';
import { v4 } from 'uuid';

const DEFAULT_TAB_TITLE = 'Untitled';
import type { ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';
import type { RouteLocationRaw, Router, RouteLocationNormalized } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';

export const initPaneRouter = async (tabId: string): Promise<Router> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:paneId',
        name: RouteNames.InitialPage,
        component: () => import('src/pages/InitialPage.vue'),
        meta: {
          titleGenerator: () => DEFAULT_TAB_TITLE,
        },
      },
      {
        path: '/:paneId/edit-note/:path(.*)',
        name: RouteNames.EditNote,
        component: () => import('src/pages/EditNote.vue'),
        meta: {
          titleGenerator: (route: RouteLocationNormalized) => {
            const filePath = route.params.path as string;
            if (!filePath) return DEFAULT_TAB_TITLE;

            const fileName = filePath.split('/').pop();
            return fileName || DEFAULT_TAB_TITLE;
          },
        },
      },
    ],
  });
  await router.push({ name: RouteNames.InitialPage, params: { paneId: tabId } });
  return router;
};

export const usePaneStore = defineStore<'panes', PaneStore>(
  'panes',
  () => {
    const panes = shallowRef<Record<string, ShallowRef<Pane>>>({});
    const activePaneId = shallowRef<string | null>(null);

    const activePane = computed(() =>
      activePaneId.value ? panes.value[activePaneId.value].value : undefined,
    );

    const getAllTabTitles = computed((): string[] => {
      return Object.values(panes.value)
        .flatMap((pane) => Object.values(pane.value.tabs.value))
        .map((tab) => tab.title);
    });

    const initNewTab = async (
      params?: Partial<Pick<Tab, 'title' | 'id' | 'paneId'>>,
    ): Promise<Tab> => {
      const id = params?.id || v4();
      const router = await initPaneRouter(id);

      const title = params?.title || getUniqueTabTitle(getAllTabTitles.value);

      const newTab = {
        title,
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
      if (!pane?.value.tabs.value[tabId]) return;

      const isActiveTabDeleted = tabId === activeTab.value?.id && paneId === activePaneId.value;
      const tabKeys = Object.keys(pane.value.tabs.value);
      const tabIndex = tabKeys.indexOf(tabId);
      const prevTabId = tabKeys[tabIndex - 1] ?? tabKeys[tabIndex + 1];

      const newTabs = { ...pane.value.tabs.value };
      delete newTabs[tabId];
      pane.value.tabs.value = newTabs;

      if (isActiveTabDeleted && prevTabId) {
        pane.value.activeTabId = prevTabId;
      }

      if (Object.keys(pane.value.tabs.value).length === 0) {
        delete panes.value[paneId];
        if (activePaneId.value === paneId) {
          const remainingPanes = Object.keys(panes.value);
          activePaneId.value = remainingPanes[0] ?? null;
        }
      }
    };

    const activeTab = computed(() => {
      if (!activePane.value?.activeTabId) return undefined;

      const tab = activePane.value.tabs.value[activePane.value.activeTabId];
      return tab || undefined;
    });

    const navigateTab = (paneId: string, tabId: string, params: RouteLocationRaw) => {
      const pane = panes.value[paneId];
      if (!pane?.value) return;

      const tab = pane.value.tabs.value[tabId];
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

    const createTabSnapshot = (tab: Tab): TabSnapshot => ({
      id: tab.id,
      title: tab.title,
      paneId: tab.paneId,
      routeLocation: {
        path: tab.router.currentRoute.value.path,
        params: { ...tab.router.currentRoute.value.params } as Record<string, string>,
        query: { ...tab.router.currentRoute.value.query } as Record<string, string>,
        hash: tab.router.currentRoute.value.hash,
        name: tab.router.currentRoute.value.name?.toString(),
      },
    });

    const createPaneSnapshot = (pane: Pane): PaneSnapshot => {
      const tabSnapshots = Object.values(pane.tabs.value).map(createTabSnapshot);
      return {
        id: pane.id,
        activeTabId: pane.activeTabId,
        tabs: tabSnapshots,
      };
    };

    const getPanesSnapshot = (): PanesSnapshot => {
      const panesSnapshot = Object.values(panes.value).map((paneRef) =>
        createPaneSnapshot(paneRef.value),
      );
      return {
        panes: panesSnapshot,
        activePaneId: activePaneId.value || '',
        timestamp: Date.now(),
      };
    };

    const restoreRouterState = async (
      router: Router,
      routeLocation: TabSnapshot['routeLocation'],
    ): Promise<void> => {
      if (routeLocation.name) {
        await router.push({
          name: routeLocation.name,
          params: routeLocation.params,
          query: routeLocation.query,
          hash: routeLocation.hash,
        });
        return;
      }
      await router.push(routeLocation.path);
    };

    const restoreTabFromSnapshot = async (tabSnapshot: TabSnapshot): Promise<Tab> => {
      const router = await initPaneRouter(tabSnapshot.id);
      await restoreRouterState(router, tabSnapshot.routeLocation);
      return {
        id: tabSnapshot.id,
        title: tabSnapshot.title,
        paneId: tabSnapshot.paneId,
        router,
      };
    };

    const restorePaneFromSnapshot = async (
      paneSnapshot: PaneSnapshot,
    ): Promise<ShallowRef<Pane>> => {
      const tabs: Record<string, Tab> = {};

      for (const tabSnapshot of paneSnapshot.tabs) {
        const tab = await restoreTabFromSnapshot(tabSnapshot);
        tabs[tab.id] = tab;
      }

      return shallowRef<Pane>({
        id: paneSnapshot.id,
        activeTabId: paneSnapshot.activeTabId,
        tabs: shallowRef(tabs),
      });
    };

    const clearPanesState = (): void => {
      panes.value = {};
      activePaneId.value = null;
    };

    const restorePanesSnapshot = async (snapshot: PanesSnapshot): Promise<void> => {
      clearPanesState();

      for (const paneSnapshot of snapshot.panes) {
        const pane = await restorePaneFromSnapshot(paneSnapshot);
        panes.value[paneSnapshot.id] = pane;
      }

      activePaneId.value = snapshot.activePaneId;
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
      getPanesSnapshot,
      restorePanesSnapshot,
    };

    return paneStore;
  },
  { persist: true },
);
