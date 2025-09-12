import { RouteNames } from 'orgnote-api';
import type { Router, RouteLocationNormalized } from 'vue-router';
import { createMemoryHistory, createRouter } from 'vue-router';

const DEFAULT_TAB_TITLE = 'Untitled';

export const createPaneRouter = async (tabId: string): Promise<Router> => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:paneId',
        name: RouteNames.InitialPage,
        component: () => import('src/pages/InitialPage.vue'),
        meta: {
          titleGenerator: () => null,
        },
      },
      {
        path: '/:paneId/edit-note',
        name: 'OpenFile',
        component: () => import('src/pages/AppBuffer.vue'),
        children: [
          {
            path: ':path(.*)',
            name: RouteNames.EditNote,
            component: () => import('src/pages/EditNote.vue'),
            meta: {
              titleGenerator: (route: RouteLocationNormalized) => {
                const filePath = route.params.path as string;
                if (!filePath) return null;

                const fileName = filePath.split('/').pop();
                return fileName || DEFAULT_TAB_TITLE;
              },
            },
          },
        ],
      },
    ],
  });

  await router.push({ name: RouteNames.InitialPage, params: { paneId: tabId } });
  return router;
};
