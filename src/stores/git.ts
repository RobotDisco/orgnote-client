import type { GitStore } from 'orgnote-api';
import {
  type GitProviderInfo,
  type GitRepoConfig,
  type GitRepoHandle,
  GitFileNotFoundError,
} from 'orgnote-api';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { createEsGitProviderInfo, ES_GIT_PROVIDER_ID } from 'src/infrastructure/git';
import { useConfigStore } from './config';
import { reporter } from 'src/boot/report';

export const useGitStore = defineStore<string, GitStore>('git', () => {
  const providers = shallowRef<Record<string, GitProviderInfo>>({});
  const currentProviderId = ref<string>('');
  const configStore = useConfigStore();
  const providerOptions = computed(() => ({
    corsProxy: configStore.config.developer.corsProxy,
  }));

  const currentProvider = computed<GitProviderInfo>(
    () => providers.value[currentProviderId.value]!,
  );

  const registerProvider = (info: GitProviderInfo): void => {
    providers.value = {
      ...providers.value,
      [info.id]: info,
    };
    currentProviderId.value = info.id;
  };

  const unregisterProvider = (id: string): void => {
    if (id === ES_GIT_PROVIDER_ID) {
      return;
    }

    const { [id]: _removed, ...rest } = providers.value;
    void _removed;
    providers.value = rest;

    if (currentProviderId.value === id) {
      currentProviderId.value = ES_GIT_PROVIDER_ID;
    }
  };

  const setProvider = (id: string): void => {
    if (!providers.value[id]) {
      reporter.reportError(`Git provider "${id}" not found`);
      return;
    }
    currentProviderId.value = id;
  };

  const handleGitError = (error: unknown): void => {
    if (error instanceof GitFileNotFoundError) {
      reporter.reportWarning(error);
      return;
    }
    reporter.reportError(error);
  };

  const openRepo: GitStore['openRepo'] = async (config: GitRepoConfig): Promise<GitRepoHandle> => {
    try {
      return await currentProvider.value.openRepo(config, providerOptions.value);
    } catch (error) {
      handleGitError(error);
      throw error;
    }
  };

  registerProvider(createEsGitProviderInfo());

  return {
    providers,
    currentProviderId,
    registerProvider,
    unregisterProvider,
    setProvider,
    openRepo,
  };
});
