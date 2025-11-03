import type { RouteLocationNormalizedLoaded } from 'vue-router';

const normalizePathParam = (path: string | string[]): string => {
  return Array.isArray(path) ? path.join('/') : path;
};

export const extractPathFromRoute = (route: RouteLocationNormalizedLoaded): string | null => {
  if (!route?.params?.path) return null;

  const path = route.params.path;
  const normalized = normalizePathParam(path);

  return normalized.length > 0 ? normalized : null;
};
