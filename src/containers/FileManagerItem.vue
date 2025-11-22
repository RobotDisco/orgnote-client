<template>
  <context-menu
    :group="contextMenuGroup"
    :data="{ path: file?.path }"
    :disabled="isSystemPath"
    @open="handleContextMenuOpen"
  >
    <menu-item :size="size" :active="active">
      <div class="file-info">
        <app-icon
          :name="file?.type === 'directory' || root ? 'sym_o_folder' : 'sym_o_draft'"
          size="sm"
        />
        <div class="name">
          <span v-if="root"> .. </span>
          <template v-else>
            <highlighter
              class="my-highlight"
              highlightClassName="highlight"
              :searchWords="highlight ?? []"
              :autoEscape="true"
              :textToHighlight="file?.name ?? ''"
            />
          </template>
        </div>
      </div>
    </menu-item>
  </context-menu>
</template>

<script lang="ts" setup>
import type { ContextMenuGroup, StyleSize } from 'orgnote-api';
import type { DiskFile } from 'orgnote-api';
import AppIcon from 'src/components/AppIcon.vue';
import MenuItem from './MenuItem.vue';
import Highlighter from 'vue-highlight-words';
import ContextMenu from 'src/components/ContextMenu.vue';
import { computed } from 'vue';
import { rootSystemFilePath } from 'src/constants/root-system-file-path';
import { api } from 'src/boot/api';

const props = defineProps<{
  highlight?: string[];
  file?: DiskFile;
  root?: boolean;
  size?: StyleSize;
  active?: boolean;
}>();

const fm = api.core.useFileManager();

const contextMenuGroup = computed<ContextMenuGroup>(() =>
  props.file?.type === 'directory' ? 'dir' : 'file',
);

const isSystemPath = computed(() =>
  props.file?.path?.startsWith(`/${rootSystemFilePath}`),
);

const handleContextMenuOpen = () => {
  if (!props.file) {
    return;
  }
  fm.focusFile = props.file;
};
</script>

<style lang="scss" scoped>
.file-info {
  @include flexify(row, flex-start, center, var(--gap-sm));
}
</style>
