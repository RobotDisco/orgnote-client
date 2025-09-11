This file is main container for all file reader buffers.

<template>
  <router-view />
</template>

<script lang="ts" setup>
import { api } from 'src/boot/api';
import { TAB_ROUTER_KEY } from 'src/constants/context-providers';
import type { ShallowRef } from 'vue';
import { inject, computed, watch } from 'vue';
import type { Router } from 'vue-router';

const router = inject<ShallowRef<Router>>(TAB_ROUTER_KEY);

const buffers = api.core.useBuffers();

const filePath = computed(() => {
  return router?.value?.currentRoute.value.params.path as string | undefined;
});

const setupBuffer = () => {
  buffers.getOrCreateBuffer(filePath.value);
};

watch(filePath, setupBuffer);
</script>
