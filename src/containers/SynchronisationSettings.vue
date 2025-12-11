<template>
  <settings-scheme :scheme="syncScheme" path="synchronization"></settings-scheme>
  <template v-if="syncAvailable">
    <app-description v-if="!user" padded>
      <div class="capitalize">{{ t(I18N.AVAILABLE_FOR_SUBSCRIPTION) }}</div>
    </app-description>

    <api-settings />
    <card-wrapper>
      <menu-item type="danger" :disabled="true">
        <div class="capitalize text-bold">{{ t(I18N.FORCE_SYNC) }}</div>
      </menu-item>
    </card-wrapper>
    <app-description>{{ t(I18N.FORCE_SYNC_DESCRIPTION) }}</app-description>
  </template>
</template>

<script lang="ts" setup>
import { ORG_NOTE_CONFIG_SCHEMA, I18N } from 'orgnote-api';
import SettingsScheme from './SettingsScheme.vue';
import AppDescription from 'src/components/AppDescription.vue';
import MenuItem from './MenuItem.vue';
import { useI18n } from 'vue-i18n';
import CardWrapper from 'src/components/CardWrapper.vue';
import { valibotScheme } from 'src/models/valibot-scheme';
import { api } from 'src/boot/api';
import ApiSettings from './ApiSettings.vue';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

const syncScheme = valibotScheme(ORG_NOTE_CONFIG_SCHEMA.entries.synchronization);
const settings = api.core.useSettings();
settings.loadApiTokens();

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);

const { config } = storeToRefs(api.core.useConfig());
console.log('[line 31]: configs', config.value);

const syncAvailable = computed(
  () => config.value.synchronization.type && config.value.synchronization.type !== 'none',
);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>
