<template>
  <app-flex class="api-settings" column start align-start gap="md">
    <app-description padded>
      <div class="capitalize">{{ t(I18N.AVAILABLE_FOR_SUBSCRIPTION) }}</div>
    </app-description>

    <card-wrapper>
      <menu-item v-for="(token, i) of tokens" type="plain" :key="i">
        {{ token.token }}
        <template #right>
          <app-flex class="actions" row start align-center gap="sm">
            <action-button
              @click="api.utils.copyToClipboard(token.token ?? '')"
              icon="content_copy"
              color="fg-muted"
              fire-icon="done"
              size="sm"
              fire-color="green"
              outline
              border
            ></action-button>
            <action-button color="fg-muted" icon="delete" size="sm" outline border></action-button>
          </app-flex>
        </template>
      </menu-item>
    </card-wrapper>
    <card-wrapper>
      <menu-item @click="addToken" type="info">
        <div class="capitalize">{{ t(I18N.CREATE_NEW_TOKEN) }}</div>
      </menu-item>
    </card-wrapper>
  </app-flex>
</template>

<script lang="ts" setup>
import { I18N } from 'orgnote-api';
import AppDescription from 'src/components/AppDescription.vue';
import { useI18n } from 'vue-i18n';
import MenuItem from './MenuItem.vue';
import CardWrapper from 'src/components/CardWrapper.vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import ActionButton from 'src/components/ActionButton.vue';
import AppFlex from 'src/components/AppFlex.vue';

const { tokens } = storeToRefs(api.core.useSettings());

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const addToken = () => {};
</script>

<style lang="scss" scoped>
.api-settings {
  & {
    width: 100%;
  }
}
.actions {
  & {
    opacity: 0;
  }
}

.menu-item {
  &:hover {
    .actions {
      opacity: 1;
    }
  }
}
</style>
