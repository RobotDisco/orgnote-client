import { createGlobalState } from '@vueuse/core';
import { api } from 'src/boot/api';
import { debounce } from 'src/utils/debounce';
import { to } from 'src/utils/to-error';
import type { Router } from 'vue-router';
import type { Tab } from 'orgnote-api';
import { ref } from 'vue';
import { DEFAULT_PANE_PERSISTENCE_SAVE_DELAY } from 'src/constants/config';

type RouterHook = () => void;
type PaneStore = ReturnType<typeof api.core.usePane>;

const collectRoutersFromPanes = (paneStore: PaneStore): Router[] =>
  Object.values(paneStore.panes.value ?? {})
    .flatMap((paneRef) => Object.values(paneRef.value?.tabs.value ?? {}) as Tab[])
    .map((tab) => tab.router)
    .filter((r): r is Router => Boolean(r));

const getObsoleteRouters = (hooks: Map<Router, RouterHook>, activeRouters: Set<Router>): Router[] =>
  Array.from(hooks.keys()).filter((router) => !activeRouters.has(router));

const registerRouterHook = (router: Router, onNavigate: () => void): RouterHook =>
  router.afterEach(onNavigate);

const getSaveDelay = (configDelay: number | undefined): number =>
  configDelay ?? DEFAULT_PANE_PERSISTENCE_SAVE_DELAY;

export const usePanePersistence = createGlobalState(() => {
  const paneStore = api.core.usePane();
  const logger = api.utils.logger;
  const configStore = api.core.useConfig();

  const routerHooks = new Map<Router, RouterHook>();
  const isStarted = ref(false);
  let unsubscribe: RouterHook | null = null;

  const handleSaveError = (error: Error): void => {
    logger.error('Pane snapshot save failed', { error, context: 'auto-save' });
  };

  const safeSave = async (): Promise<void> => {
    const result = await to(paneStore.savePanes)();
    if (result.isErr()) {
      handleSaveError(result.error);
    }
  };

  const scheduleSave = debounce(safeSave, () =>
    getSaveDelay(configStore.config.value?.ui.persistantPanesSaveDelay),
  );

  const removeHooks = (routers: Router[]): void => {
    routers.forEach((router) => {
      const remove = routerHooks.get(router);
      if (!remove) return;
      remove();
      routerHooks.delete(router);
    });
  };

  const addHooks = (routers: Router[]): void => {
    routers.forEach((router) => {
      if (routerHooks.has(router)) return;
      const removeHook = registerRouterHook(router, scheduleSave);
      routerHooks.set(router, removeHook);
    });
  };

  const syncRouterHooks = (): void => {
    const routers = collectRoutersFromPanes(paneStore);
    const activeRouters = new Set(routers);
    const obsolete = getObsoleteRouters(routerHooks, activeRouters);

    removeHooks(obsolete);
    addHooks(routers);
  };

  const restorePanes = async (): Promise<void> => {
    const restoreResult = await to(paneStore.restorePanes)();
    if (restoreResult.isErr()) {
      logger.error('Failed to restore panes', { error: restoreResult.error });
    }
  };

  const subscribeToStoreActions = (): RouterHook =>
    paneStore.$onAction(({ after }) => {
      after(() => {
        syncRouterHooks();
        scheduleSave();
      });
    });

  const cleanupHooks = (): void => {
    routerHooks.forEach((remove) => remove());
    routerHooks.clear();
  };

  const start = async (): Promise<void> => {
    if (isStarted.value) return;

    await restorePanes();
    syncRouterHooks();
    scheduleSave();
    unsubscribe = subscribeToStoreActions();

    isStarted.value = true;
  };

  const stop = (): void => {
    if (!isStarted.value) return;

    cleanupHooks();

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    isStarted.value = false;
  };

  return {
    start,
    stop,
    isStarted,
  };
});
