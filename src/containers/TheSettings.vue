<template>
  <app-flex class="settings" row start align-start gap="lg">
    <visibility-wrapper desktop-above>
      <div class="menu">
        <settings-menu />
      </div>
    </visibility-wrapper>
    <app-flex class="content" column start align-start gap="lg">
      <component :is="currentView" />
    </app-flex>
  </app-flex>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import SettingsMenu from './SettingsMenu.vue';
import { SETTINGS_ROUTER_PROVIDER_TOKEN } from 'src/constants/app-providers';
import { RouteNames } from 'orgnote-api';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    initialRoute?: RouteNames;
  }>(),
  {
    initialRoute: RouteNames.SettingsPage,
  },
);

import { getCurrentInstance } from 'vue';
import { createSettingsRouter } from './modal-settings-routes';
const instance = getCurrentInstance();
if (!instance) {
  throw new Error('getCurrentInstance returned null');
}
const app = instance.appContext.app;
const settingsRouter = createSettingsRouter();

app.provide(SETTINGS_ROUTER_PROVIDER_TOKEN, settingsRouter);
settingsRouter.isReady();

const currentRoute = computed(() => settingsRouter.currentRoute.value);

const currentView = computed(() => {
  return currentRoute.value.matched[0]?.components?.default;
});

const navigate = (routeName: string) => {
  settingsRouter.push({ name: routeName });
};

navigate(props.initialRoute);
</script>

<style lang="scss" scoped>
.settings {
  & {
    flex: 1;
    width: 100%;
    min-width: 0;
  }

  & > div {
    height: 100%;
    overflow-y: auto;
  }
}

.content {
  & {
    flex: 1;
    width: 100%;
    min-width: 0;
  }
}
</style>
