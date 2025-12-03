export function getHostRelatedPath(path: string): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const normalizedPath = path.replace(/^\/+/, '');

  return `${origin}${pathname}#/${normalizedPath}`;
}
