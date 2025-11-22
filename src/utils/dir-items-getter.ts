import Fuse from 'fuse.js';
import type { DiskFile, OrgNoteApi, CompletionSearchResult } from 'orgnote-api';

export type ReadDirFn = (path: string) => Promise<DiskFile[]>;

export const walkDir = async (
  readDir: ReadDirFn,
  path: string,
  includeFiles: boolean,
): Promise<DiskFile[]> => {
  const items = await readDir(path);
  const result: DiskFile[] = [];

  for (const item of items) {
    if (includeFiles || item.type === 'directory') {
      result.push(item);
    }
    if (item.type === 'directory') {
      const nested = await walkDir(readDir, item.path, includeFiles);
      result.push(...nested);
    }
  }

  return result;
};

export const createDirItemsGetter = (api: OrgNoteApi, includeFiles: boolean = false) => {
  let allFiles: DiskFile[] | null = null;
  let fuse: Fuse<DiskFile> | null = null;
  const completion = api.core.useCompletion();

  return async (filter: string): Promise<CompletionSearchResult<DiskFile>> => {
    const fs = api.core.useFileSystem();

    if (!allFiles) {
      allFiles = await walkDir(fs.readDir, '/', includeFiles);
      const threshold = api.core.useConfig().config.completion.fuseThreshold;
      fuse = new Fuse(allFiles, { threshold, keys: ['name', 'path'] });
    }

    const results = filter ? fuse!.search(filter).map((r) => r.item) : allFiles;

    return {
      total: results.length,
      result: results.map((item) => ({
        icon: item.type === 'directory' ? 'sym_o_folder' : 'sym_o_description',
        title: item.type === 'directory' ? `${item.path}/` : item.path,
        data: item,
        commandHandler: (file: DiskFile) => {
          completion.close(file.type === 'directory' ? `${file.path}/` : file.path);
        },
      })),
    };
  };
};
