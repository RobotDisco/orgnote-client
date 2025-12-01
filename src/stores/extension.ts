import { defineStore } from 'pinia';
import type {
  Extension,
  ExtensionManifest,
  ExtensionMeta,
  ExtensionSource,
  ExtensionSourceInfo,
  ExtensionStore,
  GitRepoHandle,
  GitSource,
} from 'orgnote-api';
import { ref, computed } from 'vue';
import { api } from 'src/boot/api';
import { compileExtension } from 'src/utils/read-extension';
import { reporter } from 'src/boot/report';
import { to } from 'src/utils/to-error';
import { useFileSystemStore } from './file-system';
import { getSystemFilesPath } from 'src/utils/get-sytem-files-path';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { useGitStore } from './git';

interface ActiveExtension extends ExtensionMeta {
  module: Extension;
}

interface ExtensionsFile {
  extensions: ExtensionMeta[];
}

interface FetchedExtension {
  manifest: ExtensionManifest;
  module: string;
  rawContent: string;
}

type SourceFetcher = (source: ExtensionSourceInfo) => Promise<FetchedExtension>;

const extensionsFilePath = getSystemFilesPath('extensions.toml');
const extensionEntryFile = 'index.js';
const extensionManifestFile = 'manifest.json';
const distFolder = 'dist';

export const useExtensionsStore = defineStore<'extension', ExtensionStore>('extension', () => {
  const extensions = ref<ExtensionMeta[]>([]);
  const activeExtensions = ref<ActiveExtension[]>([]);
  const fileSystem = useFileSystemStore();

  const loading = ref<number>(0);
  const ready = computed(() => loading.value <= 0);

  const safeParseToml = to(parseToml, (e) => new SyntaxError('Invalid TOML format', { cause: e }));
  const safeStringifyToml = to(
    stringifyToml,
    (e) => new Error('Failed to stringify TOML', { cause: e }),
  );

  const sync = async (): Promise<void> => {
    loading.value++;

    if (extensions.value.length > 0) {
      await writeToDisk();
      loading.value--;
      return;
    }

    await readFromDisk();
    await mountActiveExtensions();
    loading.value--;
  };

  const writeToDisk = async (): Promise<void> => {
    const data: ExtensionsFile = { extensions: extensions.value };
    const safeWrite = to(fileSystem.writeFile, 'Failed to write extensions.toml');

    const res = safeStringifyToml(data).asyncAndThen((content) =>
      safeWrite(extensionsFilePath, content),
    );

    const result = await res;
    if (result.isErr()) {
      reporter.reportError(result.error);
    }
  };

  const readFromDisk = async (): Promise<void> => {
    const safeRead = to(fileSystem.readFile, 'Failed to read extensions.toml');

    const res = await safeRead(extensionsFilePath, 'utf8');

    if (res.isErr()) {
      return;
    }

    const content = res.value;
    if (!content) {
      return;
    }

    const parseResult = safeParseToml(content as string);
    if (parseResult.isErr()) {
      reporter.reportError(parseResult.error);
      return;
    }

    const data = parseResult.value as unknown as ExtensionsFile;
    extensions.value = data.extensions ?? [];
  };

  const mountActiveExtensions = async (): Promise<void> => {
    for (const meta of extensions.value) {
      if (!meta.active) {
        continue;
      }
      const source = await api.infrastructure.extensionSourceRepository.get(meta.manifest.name);
      if (!source) {
        continue;
      }
      await mountExtension(meta, source);
    }
  };

  const mountExtension = async (
    meta: ExtensionMeta,
    source: ExtensionSource,
  ): Promise<ActiveExtension | undefined> => {
    const existingActive = activeExtensions.value.find(
      (e) => e.manifest.name === meta.manifest.name,
    );
    if (existingActive) {
      return existingActive;
    }

    const safeCompile = to(compileExtension, 'Failed to load extension');
    const compileResult = await safeCompile(source.module);

    if (compileResult.isErr()) {
      reporter.reportError(compileResult.error);
      return;
    }

    const module = compileResult.value;
    const safeMounted = to(module.onMounted, 'Failed to mount extension');
    const mountResult = await safeMounted(api);

    if (mountResult.isErr()) {
      reporter.reportError(mountResult.error);
      return;
    }

    const activeExt: ActiveExtension = {
      manifest: meta.manifest,
      active: true,
      config: meta.config,
      module,
    };

    activeExtensions.value.push(activeExt);
    return activeExt;
  };

  const unmountExtension = async (extensionName: string): Promise<void> => {
    const ext = activeExtensions.value.find((e) => e.manifest.name === extensionName);
    if (!ext) {
      return;
    }

    if (ext.module?.onUnmounted) {
      const safeUnmount = to(ext.module.onUnmounted, 'Failed to unmount extension');
      const result = await safeUnmount(api);

      if (result.isErr()) {
        reporter.reportError(result.error);
      }
    }

    activeExtensions.value = activeExtensions.value.filter(
      (e) => e.manifest.name !== extensionName,
    );
  };

  const enableExtension = async (extensionName: string): Promise<void> => {
    const meta = extensions.value.find((e) => e.manifest.name === extensionName);
    if (!meta) {
      reporter.reportWarning(`Extension ${extensionName} not found`);
      return;
    }

    const source = await api.infrastructure.extensionSourceRepository.get(extensionName);
    if (!source) {
      reporter.reportWarning(`Extension source ${extensionName} not found in cache`);
      return;
    }

    await mountExtension(meta, source);
    meta.active = true;
    await sync();
  };

  const disableExtension = async (extensionName: string): Promise<void> => {
    const meta = extensions.value.find((e) => e.manifest.name === extensionName);
    if (!meta) {
      reporter.reportWarning(`Extension ${extensionName} not found`);
      return;
    }

    await unmountExtension(extensionName);
    meta.active = false;
    await sync();
  };

  const isExtensionExist = (extensionName: string): boolean => {
    return !!extensions.value.find((e) => e.manifest.name === extensionName);
  };

  const addExtension = async (meta: ExtensionMeta, source: ExtensionSource): Promise<void> => {
    extensions.value = extensions.value.filter((e) => e.manifest.name !== meta.manifest.name);
    extensions.value.push(meta);

    const safeUpsert = to(
      api.infrastructure.extensionSourceRepository.upsert,
      'Failed to save extension source',
    );
    const upsertResult = await safeUpsert(source);

    if (upsertResult.isErr()) {
      reporter.reportError(upsertResult.error);
      return;
    }

    await sync();

    if (meta.active) {
      await mountExtension(meta, source);
    }
  };

  const resolveExtensionPaths = async (
    repoHandle: GitRepoHandle,
  ): Promise<{ entryPath: string; manifestPath: string | null }> => {
    const distEntryPath = `${distFolder}/${extensionEntryFile}`;
    const distManifestPath = `${distFolder}/${extensionManifestFile}`;

    const hasDistEntry = await repoHandle.fileExists(distEntryPath);

    if (hasDistEntry) {
      const hasDistManifest = await repoHandle.fileExists(distManifestPath);
      return {
        entryPath: distEntryPath,
        manifestPath: hasDistManifest ? distManifestPath : null,
      };
    }

    const hasRootEntry = await repoHandle.fileExists(extensionEntryFile);
    if (!hasRootEntry) {
      throw new Error(`Extension entry file not found: ${extensionEntryFile} or ${distEntryPath}`);
    }

    const hasRootManifest = await repoHandle.fileExists(extensionManifestFile);
    return {
      entryPath: extensionEntryFile,
      manifestPath: hasRootManifest ? extensionManifestFile : null,
    };
  };

  const extractManifestFromModule = async (moduleContent: string): Promise<ExtensionManifest> => {
    const encodedModule = encodeURIComponent(moduleContent);
    const moduleUrl = `data:text/javascript,${encodedModule}`;
    const m = (await import(/* @vite-ignore */ moduleUrl)) as {
      manifest?: ExtensionManifest;
    };

    if (!m.manifest) {
      throw new Error('Extension manifest not found in module exports');
    }

    return m.manifest;
  };

  const fetchFromGit = async (source: GitSource): Promise<FetchedExtension> => {
    const gitStore = useGitStore();

    const repoHandle = await gitStore.openRepo({
      url: source.repo,
      branch: source.branch ?? source.tag,
    });

    const paths = await resolveExtensionPaths(repoHandle);
    const moduleContent = await repoHandle.readFile(paths.entryPath, 'utf8');

    let manifest: ExtensionManifest;

    if (paths.manifestPath) {
      const manifestContent = await repoHandle.readFile(paths.manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent) as ExtensionManifest;
    } else {
      manifest = await extractManifestFromModule(moduleContent);
    }

    manifest.source = source;
    const encodedModule = encodeURIComponent(moduleContent);

    return {
      manifest,
      module: encodedModule,
      rawContent: moduleContent,
    };
  };

  const sourceFetchers: Record<ExtensionSourceInfo['type'], SourceFetcher> = {
    git: (source) => fetchFromGit(source as GitSource),
    local: () => {
      throw new Error('Local extensions cannot be installed via installExtension');
    },
  };

  const installExtension = async (source: ExtensionSourceInfo): Promise<void> => {
    const fetcher = sourceFetchers[source.type];

    const safeFetch = to(fetcher, 'Failed to fetch extension');
    const fetchResult = await safeFetch(source);

    if (fetchResult.isErr()) {
      reporter.reportError(fetchResult.error);
      return;
    }

    const fetched = fetchResult.value;

    const meta: ExtensionMeta = {
      manifest: fetched.manifest,
      active: true,
    };

    const extensionSource: ExtensionSource = {
      name: fetched.manifest.name,
      version: fetched.manifest.version,
      source: source.type === 'git' ? (source as GitSource).repo : 'local',
      module: fetched.module,
      docFiles: [],
    };

    await addExtension(meta, extensionSource);
  };

  const deleteExtension = async (extensionName: string): Promise<void> => {
    await unmountExtension(extensionName);

    const safeDelete = to(
      api.infrastructure.extensionSourceRepository.delete,
      'Failed to delete extension source',
    );
    const deleteResult = await safeDelete(extensionName);

    if (deleteResult.isErr()) {
      reporter.reportError(deleteResult.error);
    }

    extensions.value = extensions.value.filter((e) => e.manifest.name !== extensionName);
    await sync();
  };

  const enableSafeMode = async (): Promise<void> => {
    for (const ext of activeExtensions.value) {
      if (ext.manifest.source.type === 'local') {
        continue;
      }
      await unmountExtension(ext.manifest.name);
    }
  };

  const disableSafeMode = async (): Promise<void> => {
    for (const meta of extensions.value) {
      if (!meta.active) {
        continue;
      }
      const source = await api.infrastructure.extensionSourceRepository.get(meta.manifest.name);
      if (!source) {
        continue;
      }
      await mountExtension(meta, source);
    }
  };

  const store: ExtensionStore = {
    extensions,
    ready,

    sync,
    enableExtension,
    disableExtension,
    isExtensionExist,
    addExtension,
    installExtension,
    deleteExtension,
    enableSafeMode,
    disableSafeMode,
  };

  return store;
});
