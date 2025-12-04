import { RouteNames } from 'orgnote-api';
import type { Router, RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';

const DEFAULT_TAB_TITLE = 'Untitled';

const fileNameTitleGenerator = (route: RouteLocationNormalized): string => {
  const filePath = route.params.path as string;
  if (!filePath) return '';

  const fileName = filePath.split('/').pop();
  return fileName || DEFAULT_TAB_TITLE;
};

interface EditorRouteConfig {
  basePath: string;
  parentName: string;
  childName: string;
  component: () => Promise<unknown>;
}

const createBufferRoute = (config: EditorRouteConfig): RouteRecordRaw => ({
  path: `/:paneId/${config.basePath}`,
  name: config.parentName,
  component: () => import('src/pages/AppBuffer.vue'),
  children: [
    {
      path: ':path(.*)',
      name: config.childName,
      component: config.component,
      meta: {
        titleGenerator: fileNameTitleGenerator,
      },
    },
  ],
});

export const createPaneRouter = async (tabId: string): Promise<Router> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:paneId',
        name: RouteNames.InitialPage,
        component: () => import('src/pages/InitialPage.vue'),
        meta: {
          titleGenerator: () => '',
        },
      },
      createBufferRoute({
        basePath: 'edit-note',
        parentName: 'OpenFile',
        childName: RouteNames.EditNote,
        component: () => import('src/pages/EditNote.vue'),
      }),
      createBufferRoute({
        basePath: 'edit-code',
        parentName: 'OpenCode',
        childName: RouteNames.EditCode,
        component: () => import('src/pages/EditCode.vue'),
      }),
    ],
  });

  await router.push({ name: RouteNames.InitialPage, params: { paneId: tabId } });
  return router;
};
