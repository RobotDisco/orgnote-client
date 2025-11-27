<template>
  <app-flex class="search-input" row between align-center gap="sm">
    <input :name="name" :type="type" v-model="model" :placeholder="placeholder && t(placeholder)" />
    <action-button @click="model = ''" icon="sym_o_backspace" :size="size" />
  </app-flex>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import ActionButton from './ActionButton.vue';
import type { StyleSize } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

withDefaults(
  defineProps<{
    name?: string;
    placeholder?: string;
    type?: string;
    clearable?: boolean;
    size?: StyleSize;
  }>(),
  {
    type: 'text',
    clearable: true,
    size: 'sm',
  },
);

const model = defineModel();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.search-input {
  & {
    width: 100%;
  }
}

input {
  @include reset-input;

  & {
    height: 100%;
    flex: 1;
  }
}
</style>
