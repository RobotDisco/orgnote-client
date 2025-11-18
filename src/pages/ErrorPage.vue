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
        <app-card>
          <action-buttons position="right">
            <action-button icon="content_copy" fire-icon="check" :copy-text="errorLogText" border>
              <template #text>{{ $t(I18N.COPY_LOG) }}</template>
            </action-button>
            <app-button @click="reload" type="danger">{{ $t(I18N.RELOAD) }}</app-button>
          </action-buttons>
        </app-card>
      </template>
    </container-layout>
  </page-wrapper>
</template>

<script setup lang="ts">
import AppButton from 'src/components/AppButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import ActionButtons from 'src/components/ActionButtons.vue';
import PageWrapper from 'src/components/PageWrapper.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import InfoCard from 'src/components/InfoCard.vue';
import AppCard from 'src/components/AppCard.vue';
import AppLogs from 'src/containers/AppLogs.vue';
import { I18N } from 'orgnote-api';
import { useAppLogs } from 'src/composables/useAppLogs';

const { errorLogText } = useAppLogs();

const reload = (): void => {
  window.location.assign('/');
};
</script>
