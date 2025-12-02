import { type OrgNoteApi, type Command, type CompletionCandidate, I18N } from 'orgnote-api';
import Fuse from 'fuse.js';
import { extractDynamicValue } from 'src/utils/extract-dynamic-value';

const getValueByPath = (obj: CompletionCandidate<Command>, path: string | string[]): string => {
  const key = Array.isArray(path) ? path[0] : path;

  type DynamicField = Pick<
    CompletionCandidate<Command>,
    'title' | 'description' | 'icon' | 'group'
  >;
  type DynamicKey = keyof DynamicField;

  const isDynamicKey = (k: string): k is DynamicKey =>
    ['title', 'description', 'icon', 'group'].includes(k);

  if (key && isDynamicKey(key)) {
    return extractDynamicValue(obj[key]) ?? '';
  }

  return Fuse.config.getFn(obj, path) as string;
};

export async function selectCommand(
  api: OrgNoteApi,
  placeholder?: string,
): Promise<Command | undefined> {
  const commands = api.core.useCommands().commands;
  const threshold = api.core.useConfig().config.completion.fuseThreshold;

  const candidates: CompletionCandidate<Command>[] = commands.map((c) => ({
    data: c,
    group: c.group,
    icon: c.icon,
    title: c.title ?? c.command,
    description: c.description,
    commandHandler: (cmd) => {
      api.core.useCompletion().close(cmd);
    },
  }));

  const fuse = new Fuse(candidates, {
    threshold,
    keys: ['title', 'description', 'group', 'data.command'],
    getFn: getValueByPath,
  });

  const selected = await api.core.useCompletion().open<Command, Command>({
    itemsGetter: (query) => {
      const res = query ? fuse.search(query).map((r) => r.item) : candidates;
      return {
        result: res,
        total: res.length,
      };
    },
    placeholder: placeholder ?? I18N.SELECT_COMMAND,
    type: 'choice',
  });

  return selected;
}
