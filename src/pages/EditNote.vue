<template>
  <simple-org-editor v-if="buffer" v-model="buffer.content"></simple-org-editor>
  <loading-dots v-else />
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import SimpleOrgEditor from 'src/components/SimpleOrgEditor.vue';
import LoadingDots from 'src/components/LoadingDots.vue';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import type { ShallowRef } from 'vue';
import { inject, computed } from 'vue';
import type { Router } from 'vue-router';
import type { Buffer as OrgBuffer } from 'orgnote-api';

const router = inject<ShallowRef<Router>>(TAB_ROUTER_KEY);

const currentNotePath = computed(() => {
  return router?.value?.currentRoute.value.params.path as string | undefined;
});

const buffers = api.core.useBuffers();

const buffer = computed<OrgBuffer | null>(() => {
  const path = currentNotePath.value;
  if (!path) return null;
  return buffers.getBufferByPath(path);
});
</script>
