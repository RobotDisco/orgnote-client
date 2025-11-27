<template>
  <app-flex class="settings-menu" column start align-center gap="lg">
    <card-wrapper v-for="(menuItems, key) of settingsMenu" :key="key">
      <command-menu-item v-for="(menuItem, i) of menuItems" :key="i" :command="menuItem" />
    </card-wrapper>
  </app-flex>
</template>

<script lang="ts" setup>
import CardWrapper from 'src/components/CardWrapper.vue';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';
import CommandMenuItem from './CommandMenuItem.vue';
import AppFlex from 'src/components/AppFlex.vue';

const { settingsMenu } = storeToRefs(api.ui.useSettingsUi());
</script>

<style lang="scss" scoped>
.card-wrapper {
  width: 100%;
}

.settings-menu {
  width: 320px;

  @include desktop-below {
    width: 100%;
  }
}
</style>
