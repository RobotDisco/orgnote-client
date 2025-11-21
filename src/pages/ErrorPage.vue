<template>
  <page-wrapper padding constrained>
    <safe-area fit>
      <container-layout gap="lg" :body-scroll="false">
        <template #header>
          <info-card
            icon="sym_o_error"
            :title="$t(I18N.CRITICAL_ERROR)"
            :description="$t(I18N.ERROR_DESCRIPTION)"
            type="danger"
          />
        </template>

        <app-logs />

        <template #footer>
          <card-wrapper>
            <menu-item type="info" @click="copyErrorLogs">
              {{ $t(I18N.COPY_LOG) }}
            </menu-item>
            <menu-item type="danger" @click="reload">
              {{ $t(I18N.RELOAD) }}
            </menu-item>
          </card-wrapper>
        </template>
      </container-layout>
    </safe-area>
  </page-wrapper>
</template>

<script setup lang="ts">
import PageWrapper from 'src/components/PageWrapper.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import InfoCard from 'src/components/InfoCard.vue';
import AppLogs from 'src/containers/AppLogs.vue';
import { I18N } from 'orgnote-api';
import { useAppLogs } from 'src/composables/useAppLogs';
import { copyToClipboard } from 'src/utils/clipboard';
import MenuItem from 'src/containers/MenuItem.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import SafeArea from 'src/components/SafeArea.vue';
import { api } from 'src/boot/api';
import { useI18n } from 'vue-i18n';
import { to } from 'src/utils/to-error';

const { errorLogText } = useAppLogs();
const notifications = api.core.useNotifications();
const { t } = useI18n();

const safeCopyToClipboard = to(copyToClipboard);

const copyErrorLogs = async (): Promise<void> => {
  const result = await safeCopyToClipboard(errorLogText.value);

  result.match(
    () => notifications.notify({ message: t(I18N.COPIED_TO_CLIPBOARD), level: 'info' }),
    (error) => notifications.notify({ message: t(I18N.COPY), caption: error.message, level: 'danger' }),
  );
};

const reload = (): void => {
  window.location.assign('/');
};
</script>
