import type {
  ContextMenuAction,
  ContextMenuGroup,
  ContextMenuGroupParams,
  ContextMenuStore,
} from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import { defineStore } from 'pinia';
import { reactive } from 'vue';

const DEFAULT_FILE_ACTIONS: ContextMenuAction[] = [
  { command: DefaultCommands.CREATE_NOTE },
  { command: DefaultCommands.DELETE_FILE },
  { command: DefaultCommands.RENAME_FILE },
];

const DEFAULT_DIR_ACTIONS: ContextMenuAction[] = [
  { command: DefaultCommands.CREATE_FOLDER },
  { command: DefaultCommands.CREATE_NOTE },
  { command: DefaultCommands.DELETE_FILE },
  { command: DefaultCommands.RENAME_FILE },
];

const DEFAULT_GROUPS: Record<ContextMenuGroup, ContextMenuGroupParams> = {
  file: { items: DEFAULT_FILE_ACTIONS },
  dir: { items: DEFAULT_DIR_ACTIONS },
  tab: { items: [] },
};

export const useContextMenuStore = defineStore<'contextMenu', ContextMenuStore>(
  'contextMenu',
  () => {
    const groups = reactive<Map<string, ContextMenuGroupParams>>(
      new Map(Object.entries(DEFAULT_GROUPS)),
    );

    const registerGroup = (group: string) => {
      if (groups.has(group)) {
        return;
      }
      groups.set(group, { items: [] });
    };

    const updateContextGroup = (group: string, params: ContextMenuGroupParams) => {
      groups.set(group, params);
    };

    const addContextMenuAction = (group: string, action: ContextMenuAction) => {
      const groupParams = groups.get(group);
      if (!groupParams) {
        groups.set(group, { items: [action] });
        return;
      }
      groupParams.items.push(action);
    };

    const removeContextMenuAction = (group: string, action: ContextMenuAction) => {
      const groupParams = groups.get(group);
      if (!groupParams) {
        return;
      }
      const index = groupParams.items.indexOf(action);
      if (index !== -1) {
        groupParams.items.splice(index, 1);
      }
    };

    const getContextMenuActions = (group: string): ContextMenuAction[] => {
      return groups.get(group)?.items ?? [];
    };

    const store: ContextMenuStore = {
      registerGroup,
      updateContextGroup,
      addContextMenuAction,
      removeContextMenuAction,
      getContextMenuActions,
    };

    return store;
  },
);
