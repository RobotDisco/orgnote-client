import type { RouteLocationNormalizedLoaded } from 'vue-router';

const normalizePathParam = (path: string | string[]): string => {
  return Array.isArray(path) ? path.join('/') : path;
};

export const extractPathFromRoute = (route: RouteLocationNormalizedLoaded): string | undefined => {
  if (!route?.params?.path) return;

  const path = route.params.path;
  const normalized = normalizePathParam(path);

  return normalized.length > 0 ? normalized : undefined;
};
