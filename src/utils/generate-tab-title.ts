import type { RouteLocationNormalized } from 'vue-router';

const DEFAULT_TAB_TITLE = 'Untitled';

export function generateTabTitle(route: RouteLocationNormalized): string {
  const generator = route.meta?.titleGenerator;
  if (typeof generator === 'function') {
    return generator(route);
  }

  return DEFAULT_TAB_TITLE;
}
