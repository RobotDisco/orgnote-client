import {
  type InitialPaneParams,
  type Tab,
  type Pane,
  type PanesSnapshot,
  type PaneSnapshot,
  type TabSnapshot,
  RouteNames,
} from 'orgnote-api';
import type { PaneStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { getUniqueTabTitle } from 'src/utils/unique-tab-title';
import { v4 } from 'uuid';

import type { ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';
import type { RouteLocationRaw, Router } from 'vue-router';
import { createPaneRouter } from 'src/utils/pane-router';

export const usePaneStore = defineStore<'panes', PaneStore>('panes', () => {
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
    const router = await createPaneRouter(id);

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

  const resetLastTabRoute = (tab: Tab, paneId: string) => {
    if (!tab?.router) return;
    tab.router.push({ name: RouteNames.InitialPage, params: { paneId } });
  };

  const isLastTabInPane = (pane: ShallowRef<Pane>): boolean => {
    return Object.keys(pane.value.tabs.value).length === 1;
  };

  const findNextActiveTab = (tabKeys: string[], deletedTabIndex: number): string | undefined => {
    return tabKeys[deletedTabIndex - 1] ?? tabKeys[deletedTabIndex + 1];
  };

  const removeTabFromPane = (pane: ShallowRef<Pane>, tabId: string) => {
    const newTabs = { ...pane.value.tabs.value };
    delete newTabs[tabId];
    pane.value.tabs.value = newTabs;
  };

  const updateActiveTab = (pane: ShallowRef<Pane>, newActiveTabId: string) => {
    pane.value.activeTabId = newActiveTabId;
  };

  const handleActiveTabDeletion = (pane: ShallowRef<Pane>, tabKeys: string[], tabIndex: number) => {
    const nextActiveTabId = findNextActiveTab(tabKeys, tabIndex);
    if (!nextActiveTabId) return;
    updateActiveTab(pane, nextActiveTabId);
  };

  const cleanupEmptyPane = (paneId: string) => {
    delete panes.value[paneId];
    if (activePaneId.value !== paneId) return;

    const remainingPanes = Object.keys(panes.value);
    activePaneId.value = remainingPanes[0] ?? null;
  };

  const closeTab = (paneId: string, tabId: string) => {
    const pane = panes.value[paneId];
    if (!pane?.value.tabs.value[tabId]) return;

    if (isLastTabInPane(pane)) {
      const tab = pane.value.tabs.value[tabId];
      resetLastTabRoute(tab, paneId);
      return;
    }

    const tabKeys = Object.keys(pane.value.tabs.value);
    const tabIndex = tabKeys.indexOf(tabId);
    const isActiveTabDeleted = tabId === activeTab.value?.id && paneId === activePaneId.value;

    removeTabFromPane(pane, tabId);

    if (isActiveTabDeleted) {
      handleActiveTabDeletion(pane, tabKeys, tabIndex);
    }

    if (Object.keys(pane.value.tabs.value).length === 0) {
      cleanupEmptyPane(paneId);
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
    const router = await createPaneRouter(tabSnapshot.id);
    await restoreRouterState(router, tabSnapshot.routeLocation);
    return {
      id: tabSnapshot.id,
      title: tabSnapshot.title,
      paneId: tabSnapshot.paneId,
      router,
    };
  };

  const restorePaneFromSnapshot = async (paneSnapshot: PaneSnapshot): Promise<ShallowRef<Pane>> => {
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

    activePaneId.value = snapshot.activePaneId || null;
  };

  const savePanes = async (): Promise<void> => {
    const { api } = await import('src/boot/api');
    const config = api.core.useConfig();
    if (!config.config.value?.ui.persistantPanes) {
      return;
    }

    const repository = api.infrastructure.paneSnapshotRepository;
    const snapshot = getPanesSnapshot();
    await repository.save(snapshot);
  };

  const restorePanes = async (): Promise<void> => {
    const { api } = await import('src/boot/api');
    const config = api.core.useConfig();
    if (!config.config.value?.ui.persistantPanes) {
      return;
    }

    const repository = api.infrastructure.paneSnapshotRepository;
    const stored = await repository.getLatest();
    if (!stored) {
      return;
    }

    await restorePanesSnapshot(stored.snapshot);
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
    savePanes,
    restorePanes,
  };

  return paneStore;
});
