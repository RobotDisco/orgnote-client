import Fuse from 'fuse.js';
import type { DiskFile, OrgNoteApi, CompletionSearchResult } from 'orgnote-api';
import { getParentDir } from 'orgnote-api';

export const dirItemsGetter = async (
  api: OrgNoteApi,
  filter: string,
  includeFiles: boolean = false,
) => {
  const fs = api.core.useFileSystem();
  const fileInfo = await fs.fileInfo(filter);

  const isFilterNotRoot = filter !== '/';
  const isFile = fileInfo?.type === 'file';

  if (isFilterNotRoot && isFile) {
    return { total: 0, result: [] };
  }
  const parentPath = filter.endsWith('/') ? filter : getParentDir(filter);
  const dirItems = await fs.readDir(parentPath);
  const dirs = includeFiles ? dirItems : dirItems.filter((f) => f.type === 'directory');
  const threshold = api.core.useConfig().config.completion.fuseThreshold;
  const fuse = new Fuse(dirs, { threshold, keys: ['path'] });
  const matchedDirs = fuse.search(filter).map((r) => r.item);
  const completion = api.core.useCompletion();

  const res: CompletionSearchResult<DiskFile> = {
    total: matchedDirs?.length || 0,
    result: matchedDirs.map((dir) => ({
      icon: 'sym_o_folder',
      title: `${dir.path}/`,
      data: dir,
      commandHandler: (data: DiskFile) => {
        completion.activeCompletion.searchQuery = `${data.path}/`;
        return;
      },
    })),
  };

  return res;
};
