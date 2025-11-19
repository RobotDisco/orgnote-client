<template>
  <page-wrapper padding constrained>
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
          <menu-item type="info" @click="copyToClipboard(errorLogText)">
            {{ $t(I18N.COPY_LOG) }}
          </menu-item>
          <menu-item type="danger" @click="reload">
            {{ $t(I18N.RELOAD) }}
          </menu-item>
        </card-wrapper>
      </template>
    </container-layout>
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

const { errorLogText } = useAppLogs();

const reload = (): void => {
  window.location.assign('/');
};
</script>
