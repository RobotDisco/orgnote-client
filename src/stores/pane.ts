import {
  type InitialPaneParams,
  type Tab,
  type Pane,
  type PanesSnapshot,
  type PaneSnapshot,
  type TabSnapshot,
  RouteNames,
  type LayoutNode,
  type LayoutPaneNode,
  type DropDirection,
} from 'orgnote-api';
import type { PaneStore } from 'orgnote-api';
import { defineStore } from 'pinia';
import { getUniqueTabTitle } from 'src/utils/unique-tab-title';
import { v4 } from 'uuid';

import type { ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';
import type { RouteLocationRaw, Router } from 'vue-router';
import { createPaneRouter } from 'src/utils/pane-router';
import { api } from 'src/boot/api';

const validateLayout = (layout: LayoutNode, panes: Record<string, ShallowRef<Pane>>): boolean => {
  if (layout.type === 'pane') {
    return layout.paneId !== '' && !!panes[layout.paneId];
  }
  return layout.children.every((child) => validateLayout(child, panes));
};

export const usePaneStore = defineStore<'panes', PaneStore>('panes', () => {
  const panes = shallowRef<Record<string, ShallowRef<Pane>>>({});
  const activePaneId = shallowRef<string | null>(null);
  const layout = shallowRef<LayoutNode>({ type: 'pane', id: v4(), paneId: '' });

  const isDraggingTab = shallowRef(false);
  const draggedTabData = shallowRef<{ tabId: string; paneId: string } | null>(null);

  const startDraggingTab = (tabId: string, paneId: string): void => {
    draggedTabData.value = { tabId, paneId };
    isDraggingTab.value = true;
  };

  const stopDraggingTab = (): void => {
    isDraggingTab.value = false;
    draggedTabData.value = null;
  };

  const activePane = computed(() => {
    if (!activePaneId.value) return null;
    const pane = panes.value[activePaneId.value];
    return pane ? pane.value : null;
  });

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

  const createEmptyPane = (paneId: string): ShallowRef<Pane> => {
    const pane = shallowRef<Pane>({
      id: paneId,
      activeTabId: '',
      tabs: shallowRef({}),
    });

    panes.value = {
      ...panes.value,
      [paneId]: pane,
    };

    return pane;
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
    removePaneFromLayout(paneId);
    delete panes.value[paneId];
    if (activePaneId.value !== paneId) return;

    const remainingPanes = Object.keys(panes.value);
    activePaneId.value = remainingPanes[0] ?? null;
  };

  const handleLastTabDeletion = (paneId: string, pane: ShallowRef<Pane>, tabId: string): void => {
    const paneCount = Object.keys(panes.value).length;
    const hasOtherPanes = paneCount > 1;

    if (hasOtherPanes) {
      cleanupEmptyPane(paneId);
      return;
    }

    const tab = pane.value.tabs.value[tabId];
    resetLastTabRoute(tab, paneId);
  };

  const handleRegularTabDeletion = (
    pane: ShallowRef<Pane>,
    tabId: string,
    paneId: string,
  ): void => {
    const tabKeys = Object.keys(pane.value.tabs.value);
    const tabIndex = tabKeys.indexOf(tabId);
    const isActiveTabDeleted = tabId === activeTab.value?.id && paneId === activePaneId.value;

    removeTabFromPane(pane, tabId);

    if (isActiveTabDeleted) {
      handleActiveTabDeletion(pane, tabKeys, tabIndex);
    }

    const isEmpty = Object.keys(pane.value.tabs.value).length === 0;
    if (isEmpty) {
      cleanupEmptyPane(paneId);
    }
  };

  const closeTab = (paneId: string, tabId: string) => {
    const pane = panes.value[paneId];
    if (!pane?.value.tabs.value[tabId]) return;

    const isLastTab = isLastTabInPane(pane);

    if (isLastTab) {
      handleLastTabDeletion(paneId, pane, tabId);
      return;
    }

    handleRegularTabDeletion(pane, tabId, paneId);
  };

  const activeTab = computed(() => {
    if (!activePane.value?.activeTabId) return undefined;

    const tab = activePane.value.tabs.value[activePane.value.activeTabId];
    return tab || undefined;
  });

  const buildRouteParams = (params: RouteLocationRaw, paneId: string): RouteLocationRaw => {
    if (typeof params === 'string') {
      return { path: params };
    }

    if ('name' in params) {
      return { ...params, params: { ...('params' in params ? params.params : {}), paneId } };
    }

    return params;
  };

  const navigateTab = (paneId: string, tabId: string, params: RouteLocationRaw) => {
    const pane = panes.value[paneId];
    if (!pane?.value) return;

    const tab = pane.value.tabs.value[tabId];
    if (!tab?.router) return;

    const routeParams = buildRouteParams(params, paneId);
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
    initLayout();
  };

  const shouldPersistPanes = async (): Promise<boolean> => {
    const config = api.core.useConfig();
    return Boolean(config.config?.ui.persistantPanes);
  };

  const savePanes = async (): Promise<void> => {
    if (!(await shouldPersistPanes())) {
      return;
    }

    const repository = api.infrastructure.paneSnapshotRepository;
    const snapshot = getPanesSnapshot();
    await repository.save(snapshot);
  };

  const restorePanes = async (): Promise<void> => {
    if (!(await shouldPersistPanes())) {
      return;
    }

    const repository = api.infrastructure.paneSnapshotRepository;
    const stored = await repository.getLatest();
    if (!stored) {
      return;
    }

    await restorePanesSnapshot(stored.snapshot);
    initLayout();
  };

  const shouldInitializeLayout = (): boolean => {
    if (!activePaneId.value) return false;

    const isValid = validateLayout(layout.value, panes.value);
    if (isValid && layout.value.type === 'pane' && layout.value.paneId === activePaneId.value) {
      return false;
    }

    return true;
  };

  const initLayout = (): void => {
    if (!shouldInitializeLayout()) return;

    const paneNode: LayoutPaneNode = {
      type: 'pane',
      id: v4(),
      paneId: activePaneId.value!,
    };

    layout.value = paneNode;
  };

  const findPaneInLayout = (paneId: string, node?: LayoutNode): LayoutNode | null => {
    const searchNode = node ?? layout.value;

    if (searchNode.type === 'pane') {
      return searchNode.paneId === paneId ? searchNode : null;
    }

    for (const child of searchNode.children) {
      const found = findPaneInLayout(paneId, child);
      if (found) return found;
    }

    return null;
  };

  const getSplitOrientation = (direction: DropDirection): 'horizontal' | 'vertical' => {
    const isHorizontal = direction === 'left' || direction === 'right';
    return isHorizontal ? 'horizontal' : 'vertical';
  };

  const orderSplitChildren = (
    direction: DropDirection,
    newPaneNode: LayoutPaneNode,
    paneNode: LayoutNode,
  ): LayoutNode[] => {
    const shouldNewPaneFirst = direction === 'left' || direction === 'top';
    return shouldNewPaneFirst ? [newPaneNode, paneNode] : [paneNode, newPaneNode];
  };

  const createSplitNode = (
    direction: DropDirection,
    newPaneNode: LayoutPaneNode,
    paneNode: LayoutNode,
  ): LayoutNode => {
    return {
      type: 'split' as const,
      id: v4(),
      orientation: getSplitOrientation(direction),
      children: orderSplitChildren(direction, newPaneNode, paneNode),
    };
  };

  const replaceRootLayout = (splitNode: LayoutNode): void => {
    layout.value = splitNode;
  };

  const replaceNodeInTree = (
    node: LayoutNode,
    targetNode: LayoutNode,
    replacement: LayoutNode,
  ): LayoutNode => {
    if (node === targetNode) return replacement;
    if (node.type === 'split') {
      return {
        ...node,
        children: node.children.map((child) => replaceNodeInTree(child, targetNode, replacement)),
      };
    }
    return node;
  };

  const splitPaneInLayout = async (
    paneId: string,
    direction: DropDirection,
    createInitialTab: boolean = true,
  ): Promise<string | null> => {
    const paneNode = findPaneInLayout(paneId);
    if (!paneNode || paneNode.type !== 'pane') return null;

    const newPane = createInitialTab ? await initNewPane() : createEmptyPane(v4()).value;
    const newPaneId = newPane.id;

    const newPaneNode: LayoutPaneNode = {
      type: 'pane',
      id: v4(),
      paneId: newPaneId,
    };

    const splitNode = createSplitNode(direction, newPaneNode, paneNode);

    if (layout.value === paneNode) {
      replaceRootLayout(splitNode);
      return newPaneId;
    }

    layout.value = replaceNodeInTree(layout.value, paneNode, splitNode);
    return newPaneId;
  };

  const shouldRemoveNode = (node: LayoutNode, paneId: string): boolean => {
    return node.type === 'pane' && node.paneId === paneId;
  };

  const normalizeSplitNode = (filteredChildren: LayoutNode[]): LayoutNode | null => {
    if (filteredChildren.length === 0) return null;
    if (filteredChildren.length === 1) return filteredChildren[0];
    return null;
  };

  const removeNodeFromTree = (node: LayoutNode, paneId: string): LayoutNode | null => {
    if (shouldRemoveNode(node, paneId)) {
      return null;
    }

    if (node.type === 'split') {
      const filteredChildren = node.children
        .map((child) => removeNodeFromTree(child, paneId))
        .filter((child): child is LayoutNode => child !== null);

      const normalized = normalizeSplitNode(filteredChildren);
      if (normalized !== null) return normalized;

      return {
        ...node,
        children: filteredChildren,
      };
    }

    return node;
  };

  const removePaneFromLayout = (paneId: string): void => {
    if (!layout.value) return;
    if (layout.value.type === 'pane') return;

    const result = removeNodeFromTree(layout.value, paneId);
    if (result) {
      layout.value = result;
    }
  };

  const getSourceTab = (sourcePaneId: string, tabId: string): Tab | null => {
    const sourcePane = panes.value[sourcePaneId]?.value;
    if (!sourcePane) return null;

    return sourcePane.tabs.value[tabId] || null;
  };

  const transferTab = (tab: Tab, sourcePaneId: string, targetPaneId: string): void => {
    const sourcePane = panes.value[sourcePaneId];
    const targetPane = panes.value[targetPaneId];

    if (!sourcePane || !targetPane) return;

    const tabKeys = Object.keys(sourcePane.value.tabs.value);
    const tabIndex = tabKeys.indexOf(tab.id);
    const isActiveTabTransferred = tab.id === sourcePane.value.activeTabId;

    const newSourceTabs = { ...sourcePane.value.tabs.value };
    delete newSourceTabs[tab.id];
    sourcePane.value.tabs.value = newSourceTabs;

    if (isActiveTabTransferred) {
      const nextActiveTabId = findNextActiveTab(tabKeys, tabIndex);
      sourcePane.value.activeTabId = nextActiveTabId ?? '';
    }

    const newTargetTabs = { ...targetPane.value.tabs.value, [tab.id]: tab };
    targetPane.value.tabs.value = newTargetTabs;

    targetPane.value.activeTabId = tab.id;
    tab.paneId = targetPaneId;

    sourcePane.value = { ...sourcePane.value };
    targetPane.value = { ...targetPane.value };
  };

  const shouldCleanupSourcePane = (sourcePaneId: string): boolean => {
    const sourcePane = panes.value[sourcePaneId];
    if (!sourcePane) return false;
    const paneCount = Object.keys(panes.value).length;
    const isEmpty = Object.keys(sourcePane.value.tabs.value).length === 0;
    return isEmpty && paneCount > 1;
  };

  const moveTab = (tabId: string, sourcePaneId: string, targetPaneId: string): void => {
    const sourcePane = panes.value[sourcePaneId]?.value;
    const targetPane = panes.value[targetPaneId]?.value;

    if (!sourcePane || !targetPane) return;

    const tab = getSourceTab(sourcePaneId, tabId);
    if (!tab) return;

    transferTab(tab, sourcePaneId, targetPaneId);

    if (shouldCleanupSourcePane(sourcePaneId)) {
      cleanupEmptyPane(sourcePaneId);
    }

    activePaneId.value = targetPaneId;
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
    layout,
    initLayout,
    findPaneInLayout,
    splitPaneInLayout,
    removePaneFromLayout,
    moveTab,
  };

  return {
    ...paneStore,
    isDraggingTab,
    draggedTabData,
    startDraggingTab,
    stopDraggingTab,
  };
});
