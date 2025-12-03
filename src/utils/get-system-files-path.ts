import { join } from 'orgnote-api';
import { ROOT_SYSTEM_FILE_PATH } from 'src/constants/root-system-file-path';

export function getSystemFilesPath(path: string | string[]): string {
  const normalizedPath = typeof path === 'string' ? path : join(...path);

  return `${ROOT_SYSTEM_FILE_PATH}/${normalizedPath}`;
}
