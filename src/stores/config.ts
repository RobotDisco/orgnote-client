import { ORG_NOTE_CONFIG_SCHEMA, type OrgNoteConfig, type ConfigStore } from 'orgnote-api';
import { defineStore, storeToRefs } from 'pinia';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { computed, reactive, ref, watch } from 'vue';
import clone from 'rfdc';
import { useFileSystemStore } from './file-system';
import { parse } from 'valibot';
import { formatValidationErrors } from 'src/utils/format-validation-errors';
import { getSystemFilesPath } from 'src/utils/get-sytem-files-path';
import { debounce } from 'src/utils/debounce';
import { useSettingsStore } from './settings';
import { useFileSystemManagerStore } from './file-system-manager';
import { to } from 'src/utils/to-error';
import { reporter } from 'src/boot/report';
import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

export const useConfigStore = defineStore<'config', ConfigStore>(
  'config',
  () => {
    const fileSystem = useFileSystemStore();
    const diskConfigPath = getSystemFilesPath('config.json');
    const lastSyncTime = ref<number>(0);
    const { settings } = storeToRefs(useSettingsStore());
    const vault = computed(() => settings.value.vault);

    const config = reactive<OrgNoteConfig>(clone()(DEFAULT_CONFIG));

    const configErrors = ref<string[]>([]);

    const sync = async (): Promise<void> => {
      configErrors.value = [];

      const content = JSON.stringify(config);
      const newConfig = await fileSystem.syncFile(diskConfigPath, content, lastSyncTime.value);

      if (!newConfig) {
        return;
      }

      const result = parseConfig(newConfig);

      if (result.isErr()) {
        throw result.error;
      }
    };

    const parseConfig = (rawConfigContent: string): Result<void, Error> => {
      const safeJsonParse = to(
        JSON.parse,
        (e) => new SyntaxError('Invalid JSON format', { cause: e }),
      );
      const safeValidate = to(parse, (e) => new TypeError('Invalid config format', { cause: e }));

      const res = safeJsonParse(rawConfigContent).andThen((obj) =>
        safeValidate(ORG_NOTE_CONFIG_SCHEMA, obj),
      );

      return res
        .map((validated) => {
          const clonedConfig = clone()(validated);
          Object.assign(config, clonedConfig);
        })
        .orElse((e) => {
          if (e instanceof SyntaxError) return err(e);
          const errorMsg = formatValidationErrors(e);
          configErrors.value = errorMsg;
          reporter.reportError(new Error(errorMsg.join('\n'), { cause: e }));
          return ok<void, Error>(undefined);
        });
    };

    const syncWithDebounce = debounce(sync, 1000);

    const { currentFsInfo } = storeToRefs(useFileSystemManagerStore());

    watch(
      [vault, config, currentFsInfo],
      async () => {
        await syncWithDebounce();
      },
      { deep: true },
    );

    return {
      config,
      sync,
      configErrors,
    };
  },
  { persist: true },
);
