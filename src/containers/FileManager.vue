<template>
  <div class="file-manager" :class="{ compact }">
    <div class="files">
      <div class="actions">
        <action-buttons horizontal :position="compact ? 'left' : 'right'">
          <action-button
            @click="emits('dirPicked', targetPath)"
            v-if="pickDir"
            icon="sym_o_folder_check_2"
          >
            <template #text>{{ t(I18N.PICK_FOLDER) }}</template>
          </action-button>

          <command-action-button
            v-if="compact"
            :command="DefaultCommands.MAXIMIZE_FILE_MANAGER"
            :size="iconSize"
          >
          </command-action-button>
          <command-action-button
            v-if="!compact"
            :command="DefaultCommands.CREATE_NOTE"
            :size="iconSize"
          ></command-action-button>
          <command-action-button :command="DefaultCommands.CREATE_FOLDER" :size="iconSize">
          </command-action-button>
          <action-button @click="emits('close')" v-if="closable" icon="close" :size="iconSize" />
        </action-buttons>
      </div>
      <card-wrapper type="clear">
        <menu-item :size="menuItemSize">
          <search-input
            :size="compact ? 'xs' : 'sm'"
            v-model="searchQuery"
            :placeholder="I18N.SEARCH"
          />
        </menu-item>
        <menu-item :size="menuItemSize">
          <div class="file-path">
            {{ targetPath ?? '/' }}
          </div>
        </menu-item>

        <file-manager-item
          v-if="targetPath && targetPath !== '/'"
          @click="moveUp"
          root
          :size="menuItemSize"
        />
        <file-manager-item
          :highlight="searchHighlightKeywords"
          @click="handleFileClick(f)"
          v-for="f of searchFiles"
          :key="f.path"
          :file="f"
          :size="menuItemSize"
          :active="isActiveFile(f)"
        />
      </card-wrapper>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { StyleSize, Buffer as OrgBuffer } from 'orgnote-api';
import { DefaultCommands, getParentDir, I18N, join, withRoot, type DiskFile } from 'orgnote-api';
import { api } from 'src/boot/api';
import FileManagerItem from './FileManagerItem.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import MenuItem from './MenuItem.vue';
import SearchInput from 'src/components/SearchInput.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import { computed, ref, watch } from 'vue';
import CommandActionButton from './CommandActionButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  path?: string;
  tree?: boolean;
  compact?: boolean;
  pickDir?: boolean;
  closable?: boolean;
}>();

const emits = defineEmits<{
  (e: 'close'): void;
  (e: 'dirPicked', path: string): void;
}>();

const menuItemSize = computed(() => (props.compact ? 'sm' : 'auto'));

const { path: targetPath } = storeToRefs(api.core.useFileManager());
if (props.path) {
  targetPath.value = props.path;
}
const fs = api.core.useFileSystem();

const fsChangesActions: (keyof typeof fs)[] = [
  'mkdir',
  'rmdir',
  'rename',
  'writeFile',
  'syncFile',
  'deleteFile',
];

fs.$onAction(async ({ name, after }) => {
  if (!fsChangesActions.includes(name)) {
    return;
  }

  after(async () => await readDir());
});

const files = ref<DiskFile[]>([]);
const searchQuery = ref<string>('');
const searchHighlightKeywords = computed(() => searchQuery.value.split(' '));
const searchFiles = computed(() =>
  files.value.filter((f) =>
    searchQuery.value ? f.name.toLowerCase().includes(searchQuery.value) : files.value,
  ),
);

// TODO: feat/stable-beta watch fs changed
watch(targetPath, async () => {
  await readDir();
});

const readDir = async () => {
  files.value = await fs.readDir(targetPath.value);
};

readDir();

// const createDirectory = async () => {
//   const path = join(targetPath.value, 'new directory');
//   await fs.mkdir(path);
//   await readDir();
// };

const fileReader = api.core.useFileReader();
const buffers = api.core.useBuffers();
const sidebar = api.ui.useSidebar();

const handleFileClick = async (f: DiskFile) => {
  if (f.type === 'directory') {
    targetPath.value = withRoot(join(targetPath.value, f.name));
    await readDir();
    return;
  }

  fileReader.openFile(f.path);
  closeMobileSidebar();
};

const { tabletBelow } = api.ui.useScreenDetection();
const closeMobileSidebar = () => {
  if (tabletBelow.value) {
    sidebar.close();
  }
};

const moveUp = async () => {
  targetPath.value = withRoot(getParentDir(targetPath.value));
  await readDir();
};

const iconSize = computed<StyleSize>(() => (props.compact ? 'sm' : 'md'));

const activePaths = computed<Set<string>>(() => {
  const all = buffers.allBuffers as OrgBuffer[];
  const list = all.filter((b: OrgBuffer) => b.referenceCount > 0).map((b: OrgBuffer) => b.path);
  return new Set(list);
});

const isActiveFile = (file: DiskFile): boolean => {
  if (file.type !== 'file') return false;
  return activePaths.value.has(file.path);
};

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.file-manager {
  @include flexify(column, flex-start, flex-start, var(--gap-md));

  & {
    height: 100%;
  }

  .files {
    flex: 1;
  }

  div {
    width: 100%;
  }
}

.footer {
  @include flexify(row, flex-end, center, var(--gap-md));
}

.file-path {
  @include flexify(row, flex-start, center);

  & {
    color: var(--fg-alt);
    flex: 1;
  }
}

.actions {
  padding-bottom: var(--padding-sm);
}
</style>
