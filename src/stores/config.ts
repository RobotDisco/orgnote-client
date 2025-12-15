import {
  ORG_NOTE_CONFIG_SCHEMA,
  type OrgNoteConfig,
  type ConfigStore,
  type DiskFile,
} from 'orgnote-api';
import { defineStore, storeToRefs } from 'pinia';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { computed, reactive, ref, watch } from 'vue';
import clone from 'rfdc';
import { useFileSystemStore } from './file-system';
import { parse } from 'valibot';
import { formatValidationErrors } from 'src/utils/format-validation-errors';
import { debounce } from 'src/utils/debounce';
import { useSettingsStore } from './settings';
import { useFileSystemManagerStore } from './file-system-manager';
import { to } from 'src/utils/to-error';
import { reporter } from 'src/boot/report';
import type { Result } from 'neverthrow';
import { parseToml, stringifyToml } from 'orgnote-api/utils';
import { toAbsolutePath, type FileSystemChange } from 'orgnote-api';
import { useFileWatcherStore } from './file-watcher';
import { ORGNOTE_CONFIG_FILE_PATH } from 'src/constants/system-file-paths';
import { ROOT_SYSTEM_FILE_PATH } from 'src/constants/root-system-file-path';
import { isPresent } from 'src/utils/nullable-guards';
import { withDeferredFlagReset, withFlag } from 'src/utils/with-flag';

export const useConfigStore = defineStore<'config', ConfigStore>('config', () => {
  const fileSystem = useFileSystemStore();
  const diskConfigPath = ORGNOTE_CONFIG_FILE_PATH;
  const diskConfigWatchPath = toAbsolutePath(diskConfigPath);
  const configSystemDir = ROOT_SYSTEM_FILE_PATH;
  const lastSyncedMtime = ref<number>(0);
  const isInitialized = ref(false);
  const isApplyingDiskConfig = ref(false);
  const isSavingDiskConfig = ref(false);
  const { settings } = storeToRefs(useSettingsStore());
  const vault = computed(() => settings.value.vault);

  const config = reactive<OrgNoteConfig>(clone()(DEFAULT_CONFIG));

  const configErrors = ref<string[]>([]);

  const createInvalidConfigError = (cause: unknown): Error => {
    const errorMsg = formatValidationErrors(cause);
    configErrors.value = errorMsg;
    return new TypeError(errorMsg.join('\n'), { cause });
  };

  const parseRawConfig = (rawConfigContent: string): Result<OrgNoteConfig, Error> => {
    const safeTomlParse = to(
      parseToml,
      (e) => new SyntaxError('Invalid TOML format', { cause: e }),
    );
    const safeValidate = to(parse, createInvalidConfigError);

    return safeTomlParse(rawConfigContent)
      .andThen((obj) => safeValidate(ORG_NOTE_CONFIG_SCHEMA, obj))
      .map((validated) => clone()(validated));
  };

  const { currentFsInfo } = storeToRefs(useFileSystemManagerStore());

  const getConfigFileMtime = async (): Promise<number> => {
    const safeInfo = to(fileSystem.fileInfo, 'Failed to read config.toml metadata');
    const res = await safeInfo(diskConfigPath);
    if (res.isErr()) {
      reporter.reportError(res.error);
      return 0;
    }
    return res.value?.mtime ?? 0;
  };

  const ensureConfigFileExists = async (): Promise<void> => {
    const mtime = await getConfigFileMtime();
    if (mtime > 0) {
      lastSyncedMtime.value = mtime;
      return;
    }

    await withFlag(isSavingDiskConfig, async () => {
      const safeWrite = to(fileSystem.writeFile, 'Failed to write config.toml');
      const content = stringifyToml(clone()(DEFAULT_CONFIG));
      const writeResult = await safeWrite(diskConfigPath, content);
      if (writeResult.isErr()) {
        reporter.reportError(writeResult.error);
        return;
      }
      lastSyncedMtime.value = await getConfigFileMtime();
    });
  };

  const applyDefaultConfig = (): void => {
    withDeferredFlagReset(isApplyingDiskConfig, () => {
      Object.assign(config, clone()(DEFAULT_CONFIG));
    });
  };

  const applyConfigFromDisk = (rawConfigContent: string): Result<void, Error> => {
    configErrors.value = [];
    return withDeferredFlagReset(isApplyingDiskConfig, () =>
      parseRawConfig(rawConfigContent).map((validated) => {
        Object.assign(config, validated);
      }),
    );
  };

  const BROKEN_CONFIG_PATTERN = /^config-broken-(\d+)\.toml$/;

  const extractBrokenConfigIndex = (name: string): number | null => {
    const match = BROKEN_CONFIG_PATTERN.exec(name);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isInteger(value) && value >= 1 ? value : null;
  };

  const getNextBrokenConfigIndex = (files: DiskFile[]): number => {
    const maxIndex = files
      .map((f) => extractBrokenConfigIndex(f.name))
      .filter((v): v is number => isPresent(v))
      .reduce((acc, v) => Math.max(acc, v), 0);
    return maxIndex + 1;
  };

  const getNextBrokenConfigPath = async (): Promise<string> => {
    const safeReadDir = to(fileSystem.readDir, 'Failed to list system files directory');
    const res = await safeReadDir(configSystemDir);
    const files = res.isOk() ? res.value : [];
    const index = getNextBrokenConfigIndex(files);
    return `${configSystemDir}/config-broken-${index}.toml`;
  };

  const resetDiskConfigToDefault = async (): Promise<void> => {
    const safeWrite = to(fileSystem.writeFile, 'Failed to write config.toml');
    const content = stringifyToml(clone()(DEFAULT_CONFIG));
    const writeResult = await safeWrite(diskConfigPath, content);
    if (writeResult.isErr()) {
      reporter.reportError(writeResult.error);
      return;
    }
    lastSyncedMtime.value = await getConfigFileMtime();
  };

  const quarantineBrokenConfig = async (cause: Error, rawContent: string): Promise<void> => {
    const brokenPath = await getNextBrokenConfigPath();
    const safeRename = to(fileSystem.rename, 'Failed to move broken config.toml');
    const safeWrite = to(fileSystem.writeFile, 'Failed to persist broken config content');

    const persistBrokenCopy = async (): Promise<void> => {
      const persistResult = await safeWrite(brokenPath, rawContent);
      if (persistResult.isOk()) {
        return;
      }
      reporter.reportError(persistResult.error);
    };

    applyDefaultConfig();

    await withFlag(isSavingDiskConfig, async () => {
      const moveResult = await safeRename(diskConfigPath, brokenPath);
      if (moveResult.isErr()) {
        await persistBrokenCopy();
      }

      await resetDiskConfigToDefault();
    });

    reporter.reportError(
      new Error(`Invalid config.toml was moved to ${brokenPath} and reset to defaults`, {
        cause,
      }),
    );
  };

  const loadFromDisk = async (force = false): Promise<void> => {
    configErrors.value = [];

    const mtime = await getConfigFileMtime();
    if (!force && mtime <= lastSyncedMtime.value) {
      return;
    }

    const safeRead = to(fileSystem.readFile, 'Failed to read config.toml');
    const readResult = await safeRead(diskConfigPath, 'utf8');
    if (readResult.isErr()) {
      reporter.reportError(readResult.error);
      return;
    }

    const content = readResult.value;
    if (!content) {
      return;
    }

    const result = applyConfigFromDisk(content);
    if (result.isErr()) {
      await quarantineBrokenConfig(result.error, content);
      configErrors.value = [];
      lastSyncedMtime.value = await getConfigFileMtime();
      return;
    }

    lastSyncedMtime.value = mtime;
  };

  const saveToDisk = async (): Promise<void> => {
    await withFlag(isSavingDiskConfig, async () => {
      const safeWrite = to(fileSystem.writeFile, 'Failed to write config.toml');
      const content = stringifyToml(config);
      const writeResult = await safeWrite(diskConfigPath, content);
      if (writeResult.isErr()) {
        reporter.reportError(writeResult.error);
        return;
      }
      lastSyncedMtime.value = await getConfigFileMtime();
    });
  };

  const saveToDiskDebounced = debounce(saveToDisk, 1000);

  let stopDiskConfigWatch: (() => void) | null = null;

  const shouldIgnoreDiskChange = (change: FileSystemChange): boolean => {
    if (isSavingDiskConfig.value) {
      return true;
    }

    if (change.type === 'delete') {
      return true;
    }

    if (typeof change.mtime !== 'number') {
      return false;
    }

    return change.mtime <= lastSyncedMtime.value;
  };

  const onDiskConfigChange = (change: FileSystemChange): void => {
    if (change.type === 'delete') {
      applyDefaultConfig();
      void ensureConfigFileExists();
      return;
    }

    if (shouldIgnoreDiskChange(change)) {
      return;
    }
    void loadFromDisk(true);
  };

  const startDiskConfigWatch = (): void => {
    if (stopDiskConfigWatch) {
      return;
    }

    const fileWatcher = useFileWatcherStore();
    stopDiskConfigWatch = fileWatcher.watch(diskConfigWatchPath, onDiskConfigChange);
  };

  const sync = async (): Promise<void> => {
    if (isInitialized.value) {
      return;
    }

    if (!currentFsInfo.value) {
      return;
    }

    await ensureConfigFileExists();
    await loadFromDisk(true);
    startDiskConfigWatch();
    isInitialized.value = true;
  };

  watch(
    [vault, currentFsInfo],
    async () => {
      if (!currentFsInfo.value) {
        return;
      }

      if (!isInitialized.value) {
        await sync();
        return;
      }

      stopDiskConfigWatch?.();
      stopDiskConfigWatch = null;
      lastSyncedMtime.value = 0;
      await ensureConfigFileExists();
      await loadFromDisk(true);
      startDiskConfigWatch();
    },
    { deep: false },
  );

  watch(
    config,
    async () => {
      if (!isInitialized.value) {
        return;
      }

      if (isApplyingDiskConfig.value) {
        return;
      }

      await saveToDiskDebounced();
    },
    { deep: true, flush: 'post' },
  );

  return {
    config,
    sync,
    configErrors,
  };
});
