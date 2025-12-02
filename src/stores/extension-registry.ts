import { defineStore } from 'pinia';
import type { ExtensionManifest, ExtensionRegistryStore, GitRepoHandle } from 'orgnote-api';
import { ref, watch } from 'vue';
import { useConfigStore } from './config';
import { useGitStore } from './git';
import { reporter } from 'src/boot/report';
import { validateManifest } from 'src/utils/validate-manifest';
import { parse as parseToml } from 'smol-toml';

const recipesFolder = 'recipes';

export const useExtensionRegistryStore = defineStore<'extension-registry', ExtensionRegistryStore>(
  'extension-registry',
  () => {
    const availableExtensions = ref<ExtensionManifest[]>([]);
    const loading = ref(false);

    const configStore = useConfigStore();
    const gitStore = useGitStore();

    const fetchManifestsFromSource = async (sourceUrl: string): Promise<ExtensionManifest[]> => {
      const repoHandle = await gitStore.openRepo({ url: sourceUrl });
      const hasRecipes = await repoHandle.fileExists(recipesFolder);

      if (!hasRecipes) {
        return [];
      }

      return await readRecipesFromRepo(repoHandle);
    };

    const readRecipesFromRepo = async (repoHandle: GitRepoHandle): Promise<ExtensionManifest[]> => {
      const entries = await repoHandle.listDirectory(recipesFolder);
      const recipeFiles = entries.filter(
        (e) => e.type === 'file' && (e.path.endsWith('.toml') || e.path.endsWith('.json')),
      );
      const manifests: ExtensionManifest[] = [];

      for (const file of recipeFiles) {
        const content = await repoHandle.readFile(file.path, 'utf8');
        const manifest = parseAndValidateManifest(content, file.path);
        if (manifest) {
          manifests.push(manifest);
        }
      }

      return manifests;
    };

    const parseAndValidateManifest = (
      content: string,
      filePath: string,
    ): ExtensionManifest | null => {
      try {
        const isToml = filePath.endsWith('.toml');
        const manifest = isToml
          ? (parseToml(content) as ExtensionManifest)
          : (JSON.parse(content) as ExtensionManifest);
        validateManifest(manifest);
        return manifest;
      } catch (e) {
        reporter.reportWarning(`Invalid manifest in ${filePath}: ${e}`);
        return null;
      }
    };

    const refresh = async (): Promise<void> => {
      const sources = configStore.config.extensions?.sources ?? [];

      if (sources.length === 0) {
        availableExtensions.value = [];
        return;
      }

      loading.value = true;
      const allManifests: ExtensionManifest[] = [];

      for (const source of sources) {
        try {
          const manifests = await fetchManifestsFromSource(source);
          allManifests.push(...manifests);
        } catch (e) {
          reporter.reportWarning(`Failed to fetch from ${source}: ${e}`);
        }
      }

      availableExtensions.value = allManifests;
      loading.value = false;
    };

    watch(
      () => configStore.config.extensions?.sources,
      () => refresh(),
      { deep: true },
    );

    const store: ExtensionRegistryStore = {
      availableExtensions,
      loading,
      refresh,
    };

    return store;
  },
);
