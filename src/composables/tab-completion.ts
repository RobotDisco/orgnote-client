import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';
import type { ShallowRef } from 'vue';
import type {
  CandidateGetterFn,
  CompletionCandidate,
  CompletionSearchResult,
  OrgNoteApi,
  Pane,
  Tab,
} from 'orgnote-api';
import { I18N } from 'orgnote-api';

const FUSE_SEARCH_THRESHOLD = 0.4;

const fuseOptions: IFuseOptions<CompletionCandidate<Tab>> = {
  threshold: FUSE_SEARCH_THRESHOLD,
  keys: ['title'],
};

const transformPanesToCompletionCandidates = (
  panes: ShallowRef<Pane>[],
  selectTab: (paneId: string, tabId: string) => void,
): CompletionCandidate<Tab>[] => {
  return panes.flatMap((pane) => {
    const tabs = Object.values(pane.value.tabs.value);
    return tabs.map(
      (tab: Tab): CompletionCandidate<Tab> => ({
        title: tab.title,
        icon: 'sym_o_tab',
        data: tab,
        commandHandler: () => {
          selectTab(pane.value.id, tab.id);
        },
      }),
    );
  });
};

const createTabSearcher = (tabs: CompletionCandidate<Tab>[]): CandidateGetterFn<Tab> => {
  const fuse = new Fuse(tabs, fuseOptions);

  return (filter: string): CompletionSearchResult<Tab> => {
    const result = filter ? fuse.search(filter).map((r) => r.item) : tabs;

    return {
      total: result.length,
      result,
    };
  };
};

export const useTabCompletion = async (api: OrgNoteApi): Promise<void> => {
  const completion = api.core.useCompletion();
  const paneStore = api.core.usePane();
  const panes = Object.values(paneStore.panes);
  const tabs = transformPanesToCompletionCandidates(panes, paneStore.selectTab);
  const itemsGetter = createTabSearcher(tabs);

  completion.open<Tab>({
    itemsGetter,
    placeholder: I18N.TABS,
    type: 'choice',
    searchText: '',
  });
};
