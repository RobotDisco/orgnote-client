<template>
  <error-display v-if="activeBuffer?.errors.length" :errors="activeBuffer.errors" />
  <router-view v-else />
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { computed, watch, onUnmounted, ref, inject, type ShallowRef } from 'vue';
import type { Buffer as OrgBuffer } from 'orgnote-api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import type { Router } from 'vue-router';
import ErrorDisplay from 'src/components/ErrorDisplay.vue';

const buffers = api.core.useBuffers();
const route = useRoute();
const tabRouter = inject<ShallowRef<Router> | null>(TAB_ROUTER_KEY, null);

const extractPath = (r: RouteLocationNormalizedLoaded): string | undefined => {
  const p = r.params?.path as unknown;
  if (typeof p === 'string' && p.length > 0) return p;
  if (Array.isArray(p) && p.length > 0) return p.join('/');
  const fp = r.fullPath || r.path;
  if (!fp) return undefined;
  const marker = '/edit-note/';
  const idx = fp.indexOf(marker);
  if (idx >= 0) return fp.slice(idx + marker.length) || undefined;
  return undefined;
};

const filePath = computed(() => {
  const fromInjected = tabRouter?.value?.currentRoute.value as
    | RouteLocationNormalizedLoaded
    | undefined;
  const resolved = fromInjected ? extractPath(fromInjected) : undefined;
  if (resolved) return resolved;
  return route ? extractPath(route as RouteLocationNormalizedLoaded) : undefined;
});

const activeBuffer = ref<OrgBuffer | null>(null);

const cleanup = () => {
  const buf = activeBuffer.value;
  activeBuffer.value = null;
  if (!buf) return;
  buffers.releaseBuffer(buf.path);
};

watch(
  filePath,
  async (next) => {
    cleanup();
    if (!next) return;
    activeBuffer.value = await buffers.getOrCreateBuffer(next);
  },
  { immediate: true },
);

onUnmounted(() => {
  cleanup();
});
</script>
