<template>
  <simple-org-editor v-model="noteText"></simple-org-editor>
</template>

<script lang="ts" setup>
import SimpleOrgEditor from 'src/components/SimpleOrgEditor.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import { useNoteEditor } from 'src/composables/use-note-editor';
import type { ShallowRef } from 'vue';
import { inject, computed } from 'vue';
import type { Router } from 'vue-router';

const router = inject<ShallowRef<Router>>(TAB_ROUTER_KEY);

const currentNotePath = computed(() => {
  return router?.value?.currentRoute.value.params.path as string | undefined;
});

const { noteText } = useNoteEditor(currentNotePath);
</script>
