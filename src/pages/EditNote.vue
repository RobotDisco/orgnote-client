<template>
  <simple-org-editor></simple-org-editor>
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import SimpleOrgEditor from 'src/components/SimpleOrgEditor.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { usePaneStore } from 'src/stores/pane';
import type { ShallowRef } from 'vue';
import { inject, watch } from 'vue';
import { ref } from 'vue';
import type { Router } from 'vue-router';

/* eslint-disable @typescript-eslint/no-unused-vars */
const paneStore = usePaneStore();

const router = inject<ShallowRef<Router>>(TAB_ROUTER_KEY);

// TODO: to state
const fileSystem = api.core.useFileSystem();
const noteText = ref<string>();

const readNote = async () => {
  const notePath = router.value.currentRoute.value.params.path as string;
  if (!notePath) {
    return;
  }
  noteText.value = await fileSystem.readFile(notePath, 'utf8');
};

watch(router, readNote);
readNote();
</script>
